import os

def write_file(path: str, content: str) -> str:
    """
    Writes content to a file. Creates directories if they don't exist.
    """
    try:
        # Ensure directory exists if path contains one
        dirname = os.path.dirname(path)
        if dirname:
            os.makedirs(dirname, exist_ok=True)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully wrote to {path}"
    except Exception as e:
        return f"Error writing file: {str(e)}"

def read_file(path: str) -> str:
    """
    Reads content from a file.
    """
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

def list_directory(path: str = ".") -> str:
    """
    Lists files in a directory.
    """
    try:
        return "\n".join(os.listdir(path))
    except Exception as e:
        return f"Error listing directory: {str(e)}"

def replace_in_file(path: str, target: str, replacement: str) -> str:
    """
    Replaces target string with replacement string in a file.
    """
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if target not in content:
            return f"Error: Target text '{target[:20]}...' not found in {path}"
        
        content = content.replace(target, replacement)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return f"Successfully replaced text in {path}"
    except Exception as e:
        return f"Error replacing in file: {str(e)}"
