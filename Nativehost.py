import sys
import json
import struct
import os
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
    save_filename = "scraped-data.csv"

    os.makedirs(save_folder, exist_ok=True)
    filepath = os.path.join(save_folder, save_filename)

    while True:
        msg = get_message()
        data = msg.get('data', '')

        try:
            # 'w' overwrites the file each time (a fresh snapshot).
            # Change to 'a' to append instead (a running log of every scrape).
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(data)

            send_message({
                'status': 'ok',
                'path': filepath,
                'time': datetime.now().isoformat(),
            })
        except Exception as e:
            send_message({'status': 'error', 'error': str(e)})


if __name__ == '__main__':
    main()
