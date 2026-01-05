using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Collections.Generic;

namespace Zamar.Models
{
    /// <summary>
    /// Serializes and deserializes Zamar game files (.zmblx and .zm)
    /// with encryption and digital signatures
    /// </summary>
    public class GameFileSerializer
    {
        private const string ZMBLX_MAGIC = "ZMBLX";
        private const string ZM_MAGIC = "ZM";
        private const ushort VERSION = 100; // 1.00
        private const int BUFFER_SIZE = 65536;

        private byte[] _masterKey;
        private string _developerKey;

        public GameFileSerializer(byte[] masterKey, string developerKey)
        {
            _masterKey = masterKey ?? throw new ArgumentNullException(nameof(masterKey));
            _developerKey = developerKey ?? throw new ArgumentNullException(nameof(developerKey));
        }

        // =====================================================================
        // ZMBLX File Operations
        // =====================================================================

        /// <summary>
        /// Saves a game place to encrypted .zmblx file
        /// </summary>
        public void SaveZmblxFile(string filePath, GamePlace gamePlace)
        {
            using (var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write))
            {
                // Write header
                WriteZmblxHeader(fileStream);

                // Serialize game data
                var gameJson = JsonSerializer.Serialize(gamePlace);
                var gameData = Encoding.UTF8.GetBytes(gameJson);

                // Encrypt data
                var encryptedData = EncryptData(gameData);

                // Sign encrypted data
                var signature = SignData(encryptedData);

                // Write metadata
                WriteZmblxMetadata(fileStream, gamePlace, signature);

                // Write encrypted content
                fileStream.Write(encryptedData, 0, encryptedData.Length);

                // Write checksum
                WriteChecksum(fileStream, fileStream.ToArray());
            }
        }

        /// <summary>
        /// Loads and decrypts a .zmblx file
        /// </summary>
        public GamePlace LoadZmblxFile(string filePath)
        {
            using (var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read))
            {
                // Read and verify header
                var header = ReadZmblxHeader(fileStream);
                if (header.Magic != ZMBLX_MAGIC)
                    throw new InvalidOperationException("Invalid ZMBLX file");

                // Read metadata and signature
                var metadata = ReadZmblxMetadata(fileStream);
                var signature = metadata.Signature;

                // Read encrypted content
                var encryptedData = new byte[fileStream.Length - fileStream.Position - 4];
                fileStream.Read(encryptedData, 0, encryptedData.Length);

                // Verify signature
                if (!VerifySignature(encryptedData, signature))
                    throw new InvalidOperationException("File signature verification failed");

                // Decrypt data
                var decryptedData = DecryptData(encryptedData);
                var gameJson = Encoding.UTF8.GetString(decryptedData);

                // Deserialize
                var gamePlace = JsonSerializer.Deserialize<GamePlace>(gameJson);
                return gamePlace;
            }
        }

        // =====================================================================
        // ZM File Operations
        // =====================================================================

        /// <summary>
        /// Saves a game model to encrypted .zm file
        /// </summary>
        public void SaveZmFile(string filePath, GameModel model)
        {
            using (var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write))
            {
                // Write header
                WriteZmHeader(fileStream);

                // Serialize model data
                var modelJson = JsonSerializer.Serialize(model);
                var modelData = Encoding.UTF8.GetBytes(modelJson);

                // Encrypt data
                var encryptedData = EncryptData(modelData);

                // Sign encrypted data
                var signature = SignData(encryptedData);

                // Write metadata
                WriteZmMetadata(fileStream, model, signature);

                // Write encrypted content
                fileStream.Write(encryptedData, 0, encryptedData.Length);

                // Write checksum
                WriteChecksum(fileStream, fileStream.ToArray());
            }
        }

        /// <summary>
        /// Loads and decrypts a .zm file
        /// </summary>
        public GameModel LoadZmFile(string filePath)
        {
            using (var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read))
            {
                // Read and verify header
                var header = ReadZmHeader(fileStream);
                if (header.Magic != ZM_MAGIC)
                    throw new InvalidOperationException("Invalid ZM file");

                // Read metadata and signature
                var metadata = ReadZmMetadata(fileStream);
                var signature = metadata.Signature;

                // Read encrypted content
                var encryptedData = new byte[fileStream.Length - fileStream.Position - 4];
                fileStream.Read(encryptedData, 0, encryptedData.Length);

                // Verify signature
                if (!VerifySignature(encryptedData, signature))
                    throw new InvalidOperationException("File signature verification failed");

                // Decrypt data
                var decryptedData = DecryptData(encryptedData);
                var modelJson = Encoding.UTF8.GetString(decryptedData);

                // Deserialize
                var model = JsonSerializer.Deserialize<GameModel>(modelJson);
                return model;
            }
        }

        // =====================================================================
        // Encryption / Decryption
        // =====================================================================

        private byte[] EncryptData(byte[] plainData)
        {
            using (var aes = Aes.Create())
            {
                aes.KeySize = 256;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                // Generate random IV and salt
                aes.GenerateIV();
                byte[] salt = new byte[16];
                using (var rng = new RNGCryptoServiceProvider())
                {
                    rng.GetBytes(salt);
                }

                // Derive key using PBKDF2
                using (var pbkdf2 = new Rfc2898DeriveBytes(_masterKey, salt, 10000, HashAlgorithmName.SHA256))
                {
                    aes.Key = pbkdf2.GetBytes(32);
                }

                // Encrypt
                using (var encryptor = aes.CreateEncryptor(aes.Key, aes.IV))
                using (var ms = new MemoryStream())
                {
                    ms.Write(salt, 0, salt.Length);
                    ms.Write(aes.IV, 0, aes.IV.Length);

                    using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                    {
                        cs.Write(plainData, 0, plainData.Length);
                        cs.FlushFinalBlock();
                    }

                    return ms.ToArray();
                }
            }
        }

        private byte[] DecryptData(byte[] encryptedData)
        {
            using (var aes = Aes.Create())
            {
                aes.KeySize = 256;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;

                // Extract salt and IV
                byte[] salt = new byte[16];
                byte[] iv = new byte[16];
                Array.Copy(encryptedData, 0, salt, 0, 16);
                Array.Copy(encryptedData, 16, iv, 0, 16);

                // Derive key
                using (var pbkdf2 = new Rfc2898DeriveBytes(_masterKey, salt, 10000, HashAlgorithmName.SHA256))
                {
                    aes.Key = pbkdf2.GetBytes(32);
                }
                aes.IV = iv;

                // Decrypt
                using (var decryptor = aes.CreateDecryptor(aes.Key, aes.IV))
                using (var ms = new MemoryStream(encryptedData, 32, encryptedData.Length - 32))
                using (var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read))
                using (var resultMs = new MemoryStream())
                {
                    cs.CopyTo(resultMs);
                    return resultMs.ToArray();
                }
            }
        }

        // =====================================================================
        // Signing / Verification
        // =====================================================================

        private byte[] SignData(byte[] data)
        {
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_developerKey)))
            {
                return hmac.ComputeHash(data);
            }
        }

        private bool VerifySignature(byte[] data, byte[] signature)
        {
            var computedSignature = SignData(data);
            return ConstantTimeCompare(computedSignature, signature);
        }

        private bool ConstantTimeCompare(byte[] a, byte[] b)
        {
            if (a.Length != b.Length)
                return false;

            int result = 0;
            for (int i = 0; i < a.Length; i++)
            {
                result |= a[i] ^ b[i];
            }

            return result == 0;
        }

        // =====================================================================
        // File Headers
        // =====================================================================

        private void WriteZmblxHeader(FileStream stream)
        {
            // Magic number
            byte[] magic = Encoding.ASCII.GetBytes(ZMBLX_MAGIC);
            stream.Write(magic, 0, magic.Length);

            // Version
            byte[] version = BitConverter.GetBytes(VERSION);
            stream.Write(version, 0, 2);

            // Flags (0x01 = encrypted, 0x02 = compressed)
            stream.WriteByte(0x01);

            // Reserved (56 bytes)
            byte[] reserved = new byte[56];
            stream.Write(reserved, 0, reserved.Length);
        }

        private (string Magic, ushort Version) ReadZmblxHeader(FileStream stream)
        {
            byte[] magic = new byte[5];
            stream.Read(magic, 0, 5);

            byte[] version = new byte[2];
            stream.Read(version, 0, 2);

            byte flags = (byte)stream.ReadByte();

            byte[] reserved = new byte[56];
            stream.Read(reserved, 0, 56);

            return (Encoding.ASCII.GetString(magic), BitConverter.ToUInt16(version, 0));
        }

        private void WriteZmHeader(FileStream stream)
        {
            // Magic number
            byte[] magic = Encoding.ASCII.GetBytes(ZM_MAGIC);
            stream.Write(magic, 0, magic.Length);

            // Version
            byte[] version = BitConverter.GetBytes(VERSION);
            stream.Write(version, 0, 2);

            // Flags
            stream.WriteByte(0x01);

            // Reserved
            byte[] reserved = new byte[27];
            stream.Write(reserved, 0, reserved.Length);
        }

        private (string Magic, ushort Version) ReadZmHeader(FileStream stream)
        {
            byte[] magic = new byte[2];
            stream.Read(magic, 0, 2);

            byte[] version = new byte[2];
            stream.Read(version, 0, 2);

            byte flags = (byte)stream.ReadByte();

            byte[] reserved = new byte[27];
            stream.Read(reserved, 0, 27);

            return (Encoding.ASCII.GetString(magic), BitConverter.ToUInt16(version, 0));
        }

        // =====================================================================
        // Metadata
        // =====================================================================

        private void WriteZmblxMetadata(FileStream stream, GamePlace gamePlace, byte[] signature)
        {
            // Name
            WriteString(stream, gamePlace.Name);
            // Author
            WriteString(stream, "Zamar Player");
            // Version
            WriteString(stream, "1.0.0");
            // Timestamps
            stream.Write(BitConverter.GetBytes(DateTimeOffset.UtcNow.ToUnixTimeSeconds()), 0, 8);
            // Game ID
            stream.Write(gamePlace.Id.ToByteArray(), 0, 16);
            // Signature
            stream.Write(signature, 0, signature.Length);
        }

        private dynamic ReadZmblxMetadata(FileStream stream)
        {
            var name = ReadString(stream);
            var author = ReadString(stream);
            var version = ReadString(stream);

            byte[] createdBytes = new byte[8];
            stream.Read(createdBytes, 0, 8);
            var created = DateTimeOffset.FromUnixTimeSeconds(BitConverter.ToInt64(createdBytes, 0));

            byte[] idBytes = new byte[16];
            stream.Read(idBytes, 0, 16);
            var gameId = new Guid(idBytes);

            byte[] signature = new byte[32];
            stream.Read(signature, 0, 32);

            return new { Name = name, Author = author, Version = version, Created = created, GameId = gameId, Signature = signature };
        }

        private void WriteZmMetadata(FileStream stream, GameModel model, byte[] signature)
        {
            WriteString(stream, model.Name);
            WriteString(stream, "Zamar Player");
            WriteString(stream, "1.0.0");
            stream.Write(BitConverter.GetBytes(DateTimeOffset.UtcNow.ToUnixTimeSeconds()), 0, 8);
            stream.Write(model.Id.ToByteArray(), 0, 16);
            stream.Write(signature, 0, signature.Length);
        }

        private dynamic ReadZmMetadata(FileStream stream)
        {
            var name = ReadString(stream);
            var author = ReadString(stream);
            var version = ReadString(stream);

            byte[] createdBytes = new byte[8];
            stream.Read(createdBytes, 0, 8);

            byte[] idBytes = new byte[16];
            stream.Read(idBytes, 0, 16);

            byte[] signature = new byte[32];
            stream.Read(signature, 0, 32);

            return new { Name = name, Author = author, Version = version, ModelId = new Guid(idBytes), Signature = signature };
        }

        private void WriteString(FileStream stream, string str)
        {
            byte[] data = Encoding.UTF8.GetBytes(str);
            byte[] length = BitConverter.GetBytes((ushort)data.Length);
            stream.Write(length, 0, 2);
            stream.Write(data, 0, data.Length);
        }

        private string ReadString(FileStream stream)
        {
            byte[] lengthBytes = new byte[2];
            stream.Read(lengthBytes, 0, 2);
            ushort length = BitConverter.ToUInt16(lengthBytes, 0);

            byte[] data = new byte[length];
            stream.Read(data, 0, length);
            return Encoding.UTF8.GetString(data);
        }

        private void WriteChecksum(FileStream stream, byte[] data)
        {
            uint checksum = CalculateCrc32(data);
            stream.Write(BitConverter.GetBytes(checksum), 0, 4);
        }

        private uint CalculateCrc32(byte[] data)
        {
            uint crc = 0xffffffff;
            foreach (byte b in data)
            {
                crc ^= b;
                for (int i = 0; i < 8; i++)
                {
                    crc = (crc >> 1) ^ ((crc & 1) == 1 ? 0xedb88320 : 0);
                }
            }
            return crc ^ 0xffffffff;
        }
    }

    /// <summary>
    /// Represents serializable game place structure
    /// </summary>
    public class GamePlace
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; }
        public string Description { get; set; }
        public List<Part> Parts { get; set; } = new();
        public List<GameScript> Scripts { get; set; } = new();
        public Dictionary<string, object> Settings { get; set; } = new();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Represents serializable game model structure
    /// </summary>
    public class GameModel
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; }
        public List<Part> Parts { get; set; } = new();
        public List<GameAnimation> Animations { get; set; } = new();
        public Dictionary<string, object> Properties { get; set; } = new();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Represents a part in a game
    /// </summary>
    public class Part
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; }
        public string Shape { get; set; } // "Brick", "Sphere", "Cylinder", etc.
        public (double X, double Y, double Z) Position { get; set; }
        public (double X, double Y, double Z) Size { get; set; }
        public string Material { get; set; }
        public (int R, int G, int B) Color { get; set; }
        public Dictionary<string, object> Properties { get; set; } = new();
    }

    /// <summary>
    /// Represents a game script
    /// </summary>
    public class GameScript
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; }
        public string Language { get; set; } // "lua", "javascript"
        public string Code { get; set; }
        public Guid TargetPartId { get; set; }
    }

    /// <summary>
    /// Represents animation data
    /// </summary>
    public class GameAnimation
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; }
        public List<Keyframe> Keyframes { get; set; } = new();
        public double Duration { get; set; }
    }

    /// <summary>
    /// Represents animation keyframe
    /// </summary>
    public class Keyframe
    {
        public double Time { get; set; }
        public (double X, double Y, double Z) Position { get; set; }
        public (double X, double Y, double Z) Rotation { get; set; }
    }
}
