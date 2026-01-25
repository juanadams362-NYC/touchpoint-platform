\# ESP32 + PN532 Hardware Research Notes



\## Purpose

The goal of this hardware research is to validate the feasibility of using an ESP32 microcontroller with a PN532 NFC reader to capture intentional NFC-based interactions. This hardware layer serves as the physical trigger for the TouchPoint platform.



\## Hardware Components

\- ESP32 development board

\- PN532 NFC/RFID reader module

\- NFC cards/tags

\- USB cable for power and programming

\- Jumper wires (direct connections, no soldering)



\## Software Environment

\- Arduino IDE (installed)

\- ESP32 board support package (Espressif)

\- Adafruit PN532 library



\## Planned Communication Method

\- I2C communication between ESP32 and PN532

\- USB serial output for initial validation

\- Future expansion to Wi-Fi communication with backend API



\## Current Status

\- Arduino IDE successfully installed

\- ESP32 board support installed

\- PN532 library installed

\- Hardware wiring and first UID read test planned next



\## Expected Output

\- ESP32 detects NFC tag presence

\- Unique Identifier (UID) is printed to the Serial Monitor

\- Confirms reliable detection of intentional physical taps



\## Risks and Considerations

\- NFC read range limitations

\- Tag collision if multiple tags are present

\- Need for debounce or tap-rate limiting

\- Environmental interference in real-world classrooms



\## Relevance to TouchPoint Platform

Successful UID detection validates the core interaction model used throughout the platform. Attendance, event check-ins, and future task-based features all depend on this same physical interaction layer.



