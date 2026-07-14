import sys
import json
import struct
import os
import base64
from datetime import datetime


def get_message():
    """Reads one native-messaging message from Chrome (4-byte length + JSON)."""
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        sys.exit(0)
    message_length = struct.unpack('=I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)


def send_message(message_content):
    """Sends one native-messaging message back to Chrome."""
    encoded_content = json.dumps(message_content).encode('utf-8')
    encoded_length = struct.pack('=I', len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()


def main():
    # ---- CUSTOMIZE THIS: exactly where you want the data saved ----
    save_folder = r"C:\Users\YourName\Documents\ScrapedData"  # <-- change this path

    os.makedirs(save_folder, exist_ok=True)

    while True:
        msg = get_message()
        data_b64 = msg.get('data', '')
        filename = msg.get('filename') or 'scope-data.scp'
        filepath = os.path.join(save_folder, filename)

        try:
            raw_bytes = base64.b64decode(data_b64)

            # Overwrites the same filename each time (a fresh snapshot).
            # Switch to appending a timestamp if you want a new file per capture instead:
            # name, ext = os.path.splitext(filename)
            # filepath = os.path.join(save_folder, f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}")
            with open(filepath, 'wb') as f:
                f.write(raw_bytes)

            send_message({
                'status': 'ok',
                'path': filepath,
                'time': datetime.now().isoformat(),
            })
        except Exception as e:
            send_message({'status': 'error', 'error': str(e)})


if __name__ == '__main__':
    main()
