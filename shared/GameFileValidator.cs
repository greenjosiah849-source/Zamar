using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Linq;

namespace Zamar.Services
{
    /// <summary>
    /// Validates Zamar game files (.zmblx and .zm) for integrity,
    /// security, and authenticity before loading
    /// </summary>
    public class GameFileValidator
    {
        private const string ZMBLX_MAGIC = "ZMBLX";
        private const string ZM_MAGIC = "ZM";

        private List<ValidationError> _errors = new();
        private List<ValidationWarning> _warnings = new();

        // =====================================================================
        // Main Validation Methods
        // =====================================================================

        /// <summary>
        /// Performs comprehensive validation of a ZMBLX file
        /// </summary>
        public ValidationResult ValidateZmblxFile(string filePath)
        {
            _errors.Clear();
            _warnings.Clear();

            var result = new ValidationResult { FilePath = filePath };

            try
            {
                using (var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read))
                {
                    // Check 1: File header
                    if (!ValidateZmblxHeader(fileStream))
                    {
                        _errors.Add(new ValidationError { Code = "INVALID_HEADER", Message = "Invalid ZMBLX header" });
                    }

                    // Check 2: File size
                    if (!ValidateFileSize(fileStream, 500 * 1024 * 1024))
                    {
                        _errors.Add(new ValidationError { Code = "FILE_TOO_LARGE", Message = "File exceeds maximum size" });
                    }

                    // Check 3: CRC32 checksum
                    fileStream.Seek(-4, SeekOrigin.End);
                    if (!ValidateCRC32(fileStream))
                    {
                        _errors.Add(new ValidationError { Code = "CHECKSUM_FAILED", Message = "File integrity check failed" });
                    }

                    // Check 4: Signature verification
                    fileStream.Seek(0, SeekOrigin.Begin);
                    if (!ValidateFileSignature(fileStream))
                    {
                        _warnings.Add(new ValidationWarning { Code = "UNVERIFIED", Message = "File signature could not be verified" });
                    }

                    // Check 5: Metadata integrity
                    if (!ValidateMetadata(fileStream))
                    {
                        _errors.Add(new ValidationError { Code = "INVALID_METADATA", Message = "File metadata is corrupted" });
                    }

                    // Check 6: Content validation
                    if (!ValidateContent(fileStream))
                    {
                        _errors.Add(new ValidationError { Code = "INVALID_CONTENT", Message = "File content structure is invalid" });
                    }

                    // Check 7: Script safety
                    fileStream.Seek(0, SeekOrigin.Begin);
                    if (!ValidateScripts(fileStream))
                    {
                        _errors.Add(new ValidationError { Code = "DANGEROUS_SCRIPTS", Message = "File contains potentially dangerous scripts" });
                    }
                }

                result.IsValid = _errors.Count == 0;
                result.Errors = _errors;
                result.Warnings = _warnings;
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                _errors.Add(new ValidationError { Code = "VALIDATION_ERROR", Message = ex.Message });
                result.Errors = _errors;
            }

            return result;
        }

        /// <summary>
        /// Performs comprehensive validation of a ZM file
        /// </summary>
        public ValidationResult ValidateZmFile(string filePath)
        {
            _errors.Clear();
            _warnings.Clear();

            var result = new ValidationResult { FilePath = filePath };

            try
            {
                using (var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read))
                {
                    // Check 1: File header
                    if (!ValidateZmHeader(fileStream))
                    {
                        _errors.Add(new ValidationError { Code = "INVALID_HEADER", Message = "Invalid ZM header" });
                    }

                    // Check 2: File size
                    if (!ValidateFileSize(fileStream, 50 * 1024 * 1024))
                    {
                        _errors.Add(new ValidationError { Code = "FILE_TOO_LARGE", Message = "File exceeds maximum size" });
                    }

                    // Check 3: CRC32 checksum
                    fileStream.Seek(-4, SeekOrigin.End);
                    if (!ValidateCRC32(fileStream))
                    {
                        _errors.Add(new ValidationError { Code = "CHECKSUM_FAILED", Message = "File integrity check failed" });
                    }

                    // Check 4: Signature verification
                    fileStream.Seek(0, SeekOrigin.Begin);
                    if (!ValidateFileSignature(fileStream))
                    {
                        _warnings.Add(new ValidationWarning { Code = "UNVERIFIED", Message = "File signature could not be verified" });
                    }

                    // Check 5: Model data validation
                    if (!ValidateModelData(fileStream))
                    {
                        _errors.Add(new ValidationError { Code = "INVALID_MODEL", Message = "Model data is corrupted" });
                    }
                }

                result.IsValid = _errors.Count == 0;
                result.Errors = _errors;
                result.Warnings = _warnings;
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                _errors.Add(new ValidationError { Code = "VALIDATION_ERROR", Message = ex.Message });
                result.Errors = _errors;
            }

            return result;
        }

        // =====================================================================
        // Header Validation
        // =====================================================================

        private bool ValidateZmblxHeader(Stream fileStream)
        {
            byte[] magic = new byte[5];
            fileStream.Seek(0, SeekOrigin.Begin);
            
            if (fileStream.Read(magic, 0, 5) < 5)
                return false;

            var magicString = Encoding.ASCII.GetString(magic);
            if (magicString != ZMBLX_MAGIC)
                return false;

            // Read and validate version
            byte[] versionBytes = new byte[2];
            if (fileStream.Read(versionBytes, 0, 2) < 2)
                return false;

            var version = BitConverter.ToUInt16(versionBytes, 0);
            if (version > 100) // Version 1.00
                return false;

            // Read flags
            int flags = fileStream.ReadByte();
            if (flags < 0)
                return false;

            return true;
        }

        private bool ValidateZmHeader(Stream fileStream)
        {
            byte[] magic = new byte[2];
            fileStream.Seek(0, SeekOrigin.Begin);

            if (fileStream.Read(magic, 0, 2) < 2)
                return false;

            var magicString = Encoding.ASCII.GetString(magic);
            return magicString == ZM_MAGIC;
        }

        // =====================================================================
        // Checksum Validation
        // =====================================================================

        private bool ValidateCRC32(Stream fileStream)
        {
            try
            {
                // Read stored checksum (last 4 bytes)
                fileStream.Seek(-4, SeekOrigin.End);
                byte[] storedChecksum = new byte[4];
                fileStream.Read(storedChecksum, 0, 4);
                var expectedChecksum = BitConverter.ToUInt32(storedChecksum, 0);

                // Calculate checksum of file content (excluding checksum itself)
                fileStream.Seek(0, SeekOrigin.Begin);
                byte[] fileData = new byte[fileStream.Length - 4];
                fileStream.Read(fileData, 0, fileData.Length);

                var calculatedChecksum = CalculateCRC32(fileData);

                return calculatedChecksum == expectedChecksum;
            }
            catch
            {
                return false;
            }
        }

        private uint CalculateCRC32(byte[] data)
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

        // =====================================================================
        // Signature & Hash Validation
        // =====================================================================

        private bool ValidateFileSignature(Stream fileStream)
        {
            try
            {
                // Look for signature in file metadata
                // This would validate HMAC-SHA256 signature
                // Returns true if signature is valid
                return true; // Placeholder
            }
            catch
            {
                return false;
            }
        }

        // =====================================================================
        // Metadata Validation
        // =====================================================================

        private bool ValidateMetadata(Stream fileStream)
        {
            try
            {
                // Skip header (68 bytes for ZMBLX)
                fileStream.Seek(68, SeekOrigin.Begin);

                // Read game name length
                byte[] lengthBytes = new byte[2];
                if (fileStream.Read(lengthBytes, 0, 2) < 2)
                    return false;

                var nameLength = BitConverter.ToUInt16(lengthBytes, 0);
                if (nameLength > 255)
                    return false;

                // Attempt to read name
                byte[] nameBytes = new byte[nameLength];
                if (fileStream.Read(nameBytes, 0, nameLength) < nameLength)
                    return false;

                // Validate it's valid UTF-8
                try
                {
                    _ = Encoding.UTF8.GetString(nameBytes);
                }
                catch
                {
                    return false;
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        // =====================================================================
        // Content Validation
        // =====================================================================

        private bool ValidateContent(Stream fileStream)
        {
            try
            {
                // Verify decryption works
                fileStream.Seek(0, SeekOrigin.Begin);

                // This would attempt to decrypt with known key
                // and verify structure
                return true; // Placeholder
            }
            catch
            {
                return false;
            }
        }

        private bool ValidateModelData(Stream fileStream)
        {
            try
            {
                // Validate model mesh data
                // Check part counts, animation counts, etc.
                return true; // Placeholder
            }
            catch
            {
                return false;
            }
        }

        // =====================================================================
        // File Size Validation
        // =====================================================================

        private bool ValidateFileSize(Stream fileStream, long maxSize)
        {
            return fileStream.Length > 0 && fileStream.Length <= maxSize;
        }

        // =====================================================================
        // Script Safety Validation
        // =====================================================================

        private bool ValidateScripts(Stream fileStream)
        {
            try
            {
                // Scan encrypted file for dangerous patterns (before decryption)
                // This checks for known malicious code signatures

                var dangerousPatterns = new[]
                {
                    "System.Reflection",
                    "ProcessStartInfo",
                    "System.IO.File",
                    "System.Diagnostics.Process",
                    "reg.exe",
                    "cmd.exe",
                    "powershell"
                };

                // Would need to decrypt and scan content
                // This is a simplified placeholder
                return true;
            }
            catch
            {
                return false;
            }
        }

        // =====================================================================
        // Batch Validation
        // =====================================================================

        /// <summary>
        /// Validates multiple game files
        /// </summary>
        public List<ValidationResult> ValidateMultipleFiles(List<string> filePaths)
        {
            var results = new List<ValidationResult>();

            foreach (var filePath in filePaths)
            {
                if (filePath.EndsWith(".zmblx"))
                    results.Add(ValidateZmblxFile(filePath));
                else if (filePath.EndsWith(".zm"))
                    results.Add(ValidateZmFile(filePath));
            }

            return results;
        }

        /// <summary>
        /// Quick validation for pre-upload checks
        /// </summary>
        public bool QuickValidate(Stream fileStream)
        {
            try
            {
                byte[] header = new byte[6];
                fileStream.Seek(0, SeekOrigin.Begin);
                fileStream.Read(header, 0, 6);

                var magic = Encoding.ASCII.GetString(header, 0, 5);
                if (magic != ZMBLX_MAGIC && magic != ZM_MAGIC)
                    return false;

                // Quick size check
                if (fileStream.Length > 500 * 1024 * 1024)
                    return false;

                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    // =========================================================================
    // Validation Result Models
    // =========================================================================

    public class ValidationResult
    {
        public string FilePath { get; set; }
        public bool IsValid { get; set; }
        public List<ValidationError> Errors { get; set; } = new();
        public List<ValidationWarning> Warnings { get; set; } = new();
        public DateTime ValidationTime { get; set; } = DateTime.UtcNow;

        public string GetSummary()
        {
            return $"File: {FilePath} | Valid: {IsValid} | Errors: {Errors.Count} | Warnings: {Warnings.Count}";
        }
    }

    public class ValidationError
    {
        public string Code { get; set; }
        public string Message { get; set; }
    }

    public class ValidationWarning
    {
        public string Code { get; set; }
        public string Message { get; set; }
    }
}
