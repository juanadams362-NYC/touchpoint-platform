\# Hardware Attempt 0: ESP32 + PN532 (I2C)



\## Goal

Validate NFC UID reading using an ESP32 + PN532 as the physical interaction layer for TouchPoint.



\## Evidence Captured

\- ESP32 serial heartbeat output (firmware execution confirmed)

\- PN532 detection attempt output (module not detected)

\- Photo of wiring setup



\## What Worked

\- ESP32 recognized by Windows via CP210x driver and assigned a COM port

\- Arduino IDE uploads firmware successfully (verified by serial output)



\## What Was Attempted

\- PN532 wired for I2C: VCC=3V3, GND=GND, SDA/SCL to ESP32 I2C pins

\- PN532 UID reader sketch executed



\## Result

\- PN532 not detected by library at runtime:

&nbsp; "ERROR: PN532 not found. Check wiring, I2C mode, and power."



\## Most Likely Cause

\- Board variant may require IRQ/RESET wiring for I2C support or a different communication mode (SPI/HSU).

\- Additional female jumper wires were not available to add IRQ/RESET during this iteration.



\## Planned Fix (Next Iteration)

\- Acquire additional jumper wires and test I2C again with IRQ/RESET wiring

\- If I2C still fails, pivot to SPI mode and update firmware accordingly



