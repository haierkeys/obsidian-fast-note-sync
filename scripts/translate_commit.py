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

    # Use a single instance of translators to potentially benefit from some caching if it exists
    translator_zh = GoogleTranslator(source='auto', target='zh-CN')
    translator_en = GoogleTranslator(source='auto', target='en')

    lines = msg.split('\n')
    
    for line in lines:
        # Extract leading whitespace (indentation)
        indent = line[:len(line) - len(line.lstrip())]
        content = line.strip()
        
        if not content:
            print(line) # Preserve empty lines or lines with only spaces
            continue

        try:
            # Translate only the content to avoid translator messing with indentation
            zh_trans = translator_zh.translate(content)
            en_trans = translator_en.translate(content)

            # Re-apply indentation to both translations
            print(f"{indent}{zh_trans}")
            print(f"{indent}{en_trans}")

        except Exception as e:
            # If translation fails, print original line (which contains indentation)
            print(f"{line}")

if __name__ == "__main__":
    main()
