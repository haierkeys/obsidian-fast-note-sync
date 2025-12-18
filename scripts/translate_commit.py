import os
import sys
from deep_translator import GoogleTranslator

def main():
    # Get message from environment variable or command line argument
    msg = os.environ.get('COMMIT_MSG', '')
    if len(sys.argv) > 1:
        msg = sys.argv[1]

    if not msg:
        print("No commit message found.")
        return

    try:
        # Translate to Chinese
        zh_trans = GoogleTranslator(source='auto', target='zh-CN').translate(msg)
        # Translate to English
        en_trans = GoogleTranslator(source='auto', target='en').translate(msg)

        # Output in the requested format: Chinese \n English
        # We ensure they are not identical to avoid duplication if source was already one of them
        # But user explicitly asked for "Chinese and English", so we output both.

        print(f"{zh_trans}")
        print(f"{en_trans}")

    except Exception as e:
        print(f"Translation failed: {e}")
        # Fallback to original message
        print(msg)

if __name__ == "__main__":
    main()
