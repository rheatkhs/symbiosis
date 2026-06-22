## Capability: rclone-bootstrap

PowerShell automation for downloading, extracting, and initializing `rclone.exe` on Windows.

## Requirements

### BOOT-01: Rclone Binary Download
- The script MUST download the official Rclone Windows AMD64 zip from `https://downloads.rclone.org/rclone-current-windows-amd64.zip`.
- The download MUST use PowerShell's `Invoke-WebRequest` or `Invoke-RestMethod`.
- The script MUST display download progress to the user.

### BOOT-02: Binary Extraction
- The script MUST extract only `rclone.exe` from the downloaded zip archive.
- The binary MUST be placed in a `.bin/` directory at the project root.
- The `.bin/` directory MUST be created if it does not exist.
- The downloaded zip MUST be cleaned up after extraction.

### BOOT-03: Binary Verification
- After extraction, the script MUST verify the binary by running `.bin/rclone.exe version`.
- The script MUST display the installed Rclone version to the user.
- If verification fails, the script MUST exit with a non-zero exit code and error message.

### BOOT-04: Daemon Start Command
- The script MUST print the exact command to start the Rclone RC daemon:
  ```
  .bin/rclone.exe rcd --rc-no-auth --rc-addr=:5572
  ```
- The script MUST NOT start the daemon automatically (user controls daemon lifecycle).

### BOOT-05: Gitignore Management
- The script MUST check if `.gitignore` exists and if `.bin/` is listed.
- If `.bin/` is not in `.gitignore`, the script MUST append it.
- If `.gitignore` does not exist, the script MUST create it with `.bin/` entry.

### BOOT-06: Idempotency
- If `rclone.exe` already exists in `.bin/`, the script MUST ask the user whether to re-download or skip.
- The script MUST be safe to run multiple times without side effects.
