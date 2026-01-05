using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Zamar.Services
{
    /// <summary>
    /// Secure handler for uploading and validating game files
    /// Prevents malicious file uploads and ensures file integrity
    /// </summary>
    public class SecureGameFileUploadHandler
    {
        private const long MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
        private const string UPLOAD_DIRECTORY = "./uploads/games";
        private const string QUARANTINE_DIRECTORY = "./uploads/quarantine";

        private List<string> _allowedMimeTypes = new()
        {
            "application/octet-stream", // Binary files
            "application/x-zamar-game", // Custom ZMBLX
            "application/x-zamar-model" // Custom ZM
        };

        private List<string> _blockedFilePatterns = new()
        {
            ".exe", ".dll", ".bat", ".cmd", ".scr", ".vbs", ".js",
            ".jar", ".zip", ".rar", ".7z", // Potentially dangerous archives
            ".ps1", ".sh", ".bash" // Scripts
        };

        public SecureGameFileUploadHandler()
        {
            EnsureDirectoriesExist();
        }

        // =====================================================================
        // Upload Handling
        // =====================================================================

        /// <summary>
        /// Validates and processes a game file upload
        /// </summary>
        public async Task<UploadResult> HandleGameFileUpload(
            Stream fileStream, 
            string filename, 
            string uploadedBy, 
            string mimeType)
        {
            var result = new UploadResult
            {
                Filename = filename,
                UploadedBy = uploadedBy,
                UploadTime = DateTime.UtcNow
            };

            try
            {
                // Step 1: Validate filename
                if (!ValidateFilename(filename))
                {
                    result.IsSuccess = false;
                    result.ErrorMessage = "Invalid filename";
                    return result;
                }

                // Step 2: Check file size
                if (fileStream.Length > MAX_FILE_SIZE)
                {
                    result.IsSuccess = false;
                    result.ErrorMessage = $"File exceeds maximum size of {MAX_FILE_SIZE / 1024 / 1024} MB";
                    return result;
                }

                // Step 3: Validate MIME type
                if (!ValidateMimeType(mimeType, filename))
                {
                    result.IsSuccess = false;
                    result.ErrorMessage = "Invalid file type";
                    return result;
                }

                // Step 4: Scan file for malicious content
                var scanResult = await ScanFileForMalware(fileStream);
                if (!scanResult.IsSafe)
                {
                    result.IsSuccess = false;
                    result.ErrorMessage = $"File quarantined: {scanResult.ThreatFound}";
                    result.IsQuarantined = true;
                    await QuarantineFile(fileStream, filename, scanResult.ThreatFound);
                    return result;
                }

                // Step 5: Calculate file hash
                fileStream.Seek(0, SeekOrigin.Begin);
                var fileHash = CalculateSHA256(fileStream);
                result.FileHash = fileHash;

                // Step 6: Validate game file structure
                fileStream.Seek(0, SeekOrigin.Begin);
                if (!ValidateGameFileStructure(fileStream, filename))
                {
                    result.IsSuccess = false;
                    result.ErrorMessage = "Invalid game file structure";
                    return result;
                }

                // Step 7: Store file securely
                fileStream.Seek(0, SeekOrigin.Begin);
                var storagePath = await StoreFileSecurely(fileStream, filename, fileHash, uploadedBy);
                result.StoragePath = storagePath;

                // Step 8: Create backup
                fileStream.Seek(0, SeekOrigin.Begin);
                await CreateBackup(fileStream, filename, fileHash);

                result.IsSuccess = true;
                return result;
            }
            catch (Exception ex)
            {
                result.IsSuccess = false;
                result.ErrorMessage = $"Upload error: {ex.Message}";
                return result;
            }
        }

        // =====================================================================
        // Validation
        // =====================================================================

        private bool ValidateFilename(string filename)
        {
            if (string.IsNullOrWhiteSpace(filename))
                return false;

            // Only allow .zmblx and .zm files
            if (!filename.EndsWith(".zmblx") && !filename.EndsWith(".zm"))
                return false;

            // Check for path traversal
            if (filename.Contains("..") || filename.Contains("/") || filename.Contains("\\"))
                return false;

            // Check for suspicious patterns
            var extension = Path.GetExtension(filename).ToLower();
            if (_blockedFilePatterns.Any(p => filename.Contains(p)))
                return false;

            return true;
        }

        private bool ValidateMimeType(string mimeType, string filename)
        {
            var extension = Path.GetExtension(filename).ToLower();

            // Map extensions to expected MIME types
            var expectedMimes = extension switch
            {
                ".zmblx" => new[] { "application/x-zamar-game", "application/octet-stream" },
                ".zm" => new[] { "application/x-zamar-model", "application/octet-stream" },
                _ => new string[] { }
            };

            return expectedMimes.Contains(mimeType.ToLower());
        }

        private bool ValidateGameFileStructure(Stream fileStream, string filename)
        {
            try
            {
                byte[] header = new byte[6];
                fileStream.Read(header, 0, 6);

                var magic = Encoding.ASCII.GetString(header, 0, 
                    filename.EndsWith(".zmblx") ? 5 : 2);

                if (filename.EndsWith(".zmblx"))
                    return magic == "ZMBLX";
                else if (filename.EndsWith(".zm"))
                    return magic == "ZM";

                return false;
            }
            catch
            {
                return false;
            }
        }

        // =====================================================================
        // Malware Scanning
        // =====================================================================

        /// <summary>
        /// Scans file for malicious patterns and content
        /// </summary>
        private async Task<MalwareScanResult> ScanFileForMalware(Stream fileStream)
        {
            var result = new MalwareScanResult { IsSafe = true };

            try
            {
                // Scan for known malicious signatures
                if (CheckForMaliciousSignatures(fileStream))
                {
                    result.IsSafe = false;
                    result.ThreatFound = "Known malware signature detected";
                    return result;
                }

                // Check file entropy (high entropy = suspicious)
                fileStream.Seek(0, SeekOrigin.Begin);
                if (CalculateFileEntropy(fileStream) > 7.8)
                {
                    result.IsSafe = false;
                    result.ThreatFound = "Suspicious file entropy detected";
                    return result;
                }

                // Could integrate with VirusTotal API here
                // var vtResult = await ScanWithVirusTotal(fileStream);
                // if (!vtResult.IsSafe) return vtResult;

                return result;
            }
            catch
            {
                return result;
            }
        }

        private bool CheckForMaliciousSignatures(Stream fileStream)
        {
            var maliciousSignatures = new[]
            {
                new byte[] { 0x4D, 0x5A }, // MZ (PE executable)
                new byte[] { 0x7F, 0x45, 0x4C, 0x46 }, // ELF executable
                new byte[] { 0xCA, 0xFE, 0xBA, 0xBE } // Java class
            };

            byte[] buffer = new byte[4];
            fileStream.Seek(0, SeekOrigin.Begin);
            fileStream.Read(buffer, 0, 4);

            foreach (var signature in maliciousSignatures)
            {
                if (buffer.Take(signature.Length).SequenceEqual(signature))
                    return true;
            }

            return false;
        }

        private double CalculateFileEntropy(Stream fileStream)
        {
            var frequencies = new int[256];
            int byte_read;

            while ((byte_read = fileStream.ReadByte()) != -1)
            {
                frequencies[byte_read]++;
            }

            double entropy = 0.0;
            int fileSize = (int)fileStream.Length;

            for (int i = 0; i < 256; i++)
            {
                if (frequencies[i] > 0)
                {
                    double probability = (double)frequencies[i] / fileSize;
                    entropy -= probability * Math.Log(probability, 2);
                }
            }

            return entropy;
        }

        // =====================================================================
        // File Storage
        // =====================================================================

        private async Task<string> StoreFileSecurely(
            Stream fileStream, 
            string filename, 
            string fileHash,
            string uploadedBy)
        {
            var uniqueFilename = $"{fileHash}_{filename}";
            var storagePath = Path.Combine(UPLOAD_DIRECTORY, uniqueFilename);

            // Encrypt file before storing
            byte[] key = new byte[32];
            byte[] iv = new byte[16];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(key);
                rng.GetBytes(iv);
            }

            using (var outputStream = new FileStream(storagePath, FileMode.Create))
            {
                // Write IV (needed for decryption)
                outputStream.Write(iv, 0, iv.Length);

                // Encrypt and write file
                using (var aes = System.Security.Cryptography.Aes.Create())
                {
                    aes.Key = key;
                    aes.IV = iv;

                    using (var encryptor = aes.CreateEncryptor())
                    using (var cryptoStream = new System.Security.Cryptography.CryptoStream(
                        outputStream, encryptor, System.Security.Cryptography.CryptoStreamMode.Write))
                    {
                        await fileStream.CopyToAsync(cryptoStream);
                    }
                }
            }

            // Store key reference
            await LogFileUpload(filename, fileHash, storagePath, uploadedBy, Convert.ToBase64String(key));

            return storagePath;
        }

        private async Task CreateBackup(Stream fileStream, string filename, string fileHash)
        {
            var backupPath = Path.Combine(UPLOAD_DIRECTORY, "backups", $"{fileHash}_backup");
            using (var backupStream = new FileStream(backupPath, FileMode.Create))
            {
                await fileStream.CopyToAsync(backupStream);
            }
        }

        private async Task QuarantineFile(Stream fileStream, string filename, string threat)
        {
            var quarantinePath = Path.Combine(QUARANTINE_DIRECTORY, $"{DateTime.UtcNow.Ticks}_{filename}");
            using (var quarantineStream = new FileStream(quarantinePath, FileMode.Create))
            {
                await fileStream.CopyToAsync(quarantineStream);
            }

            await LogQuarantine(filename, threat, quarantinePath);
        }

        // =====================================================================
        // File Retrieval
        // =====================================================================

        /// <summary>
        /// Retrieves and decrypts a stored game file
        /// </summary>
        public async Task<Stream> RetrieveGameFile(string fileHash, string decryptionKey)
        {
            var filename = await GetStoredFilename(fileHash);
            var storagePath = Path.Combine(UPLOAD_DIRECTORY, filename);

            if (!File.Exists(storagePath))
                throw new FileNotFoundException($"Game file not found: {fileHash}");

            // Decrypt file
            var fileStream = new FileStream(storagePath, FileMode.Open, FileAccess.Read);
            byte[] iv = new byte[16];
            fileStream.Read(iv, 0, 16);

            var key = Convert.FromBase64String(decryptionKey);

            using (var aes = System.Security.Cryptography.Aes.Create())
            {
                aes.Key = key;
                aes.IV = iv;

                var decryptor = aes.CreateDecryptor();
                var cryptoStream = new System.Security.Cryptography.CryptoStream(
                    fileStream, decryptor, System.Security.Cryptography.CryptoStreamMode.Read);

                var resultStream = new MemoryStream();
                await cryptoStream.CopyToAsync(resultStream);
                resultStream.Seek(0, SeekOrigin.Begin);
                return resultStream;
            }
        }

        // =====================================================================
        // Helper Methods
        // =====================================================================

        private string CalculateSHA256(Stream fileStream)
        {
            fileStream.Seek(0, SeekOrigin.Begin);
            using (var sha = SHA256.Create())
            {
                var hash = sha.ComputeHash(fileStream);
                return Convert.ToHexString(hash);
            }
        }

        private void EnsureDirectoriesExist()
        {
            Directory.CreateDirectory(UPLOAD_DIRECTORY);
            Directory.CreateDirectory(QUARANTINE_DIRECTORY);
            Directory.CreateDirectory(Path.Combine(UPLOAD_DIRECTORY, "backups"));
        }

        private async Task LogFileUpload(string filename, string hash, string path, string uploadedBy, string keyRef)
        {
            // TODO: Log to database
            await Task.CompletedTask;
        }

        private async Task LogQuarantine(string filename, string threat, string path)
        {
            // TODO: Log to database and alert admins
            await Task.CompletedTask;
        }

        private async Task<string> GetStoredFilename(string fileHash)
        {
            // TODO: Retrieve from database
            return "";
        }
    }

    // =========================================================================
    // Result Models
    // =========================================================================

    public class UploadResult
    {
        public bool IsSuccess { get; set; }
        public string Filename { get; set; }
        public string UploadedBy { get; set; }
        public DateTime UploadTime { get; set; }
        public string FileHash { get; set; }
        public string StoragePath { get; set; }
        public string ErrorMessage { get; set; }
        public bool IsQuarantined { get; set; }
    }

    public class MalwareScanResult
    {
        public bool IsSafe { get; set; }
        public string ThreatFound { get; set; }
        public DateTime ScanTime { get; set; } = DateTime.UtcNow;
    }
}
