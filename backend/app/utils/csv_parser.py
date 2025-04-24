import csv
import io
import random
import string
from typing import List, Dict, Any

class CSVParseError(Exception):
    """Custom exception for CSV parsing errors"""
    pass

def generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure at least one of each required character type
    password = [
        random.choice(string.ascii_lowercase),
        random.choice(string.ascii_uppercase),
        random.choice(string.digits),
        random.choice("!@#$%^&*")
    ]
    # Fill the rest with random characters
    password.extend(random.choice(characters) for _ in range(length - 4))
    # Shuffle the password
    random.shuffle(password)
    return ''.join(password)

def validate_email(email: str) -> bool:
    """Basic email validation"""
    # Simple validation - could be more complex in production
    return '@' in email and '.' in email.split('@')[1]

def parse_csv_content(csv_content: str, required_headers: List[str]) -> List[Dict[str, Any]]:
    """
    Parse CSV content and validate required headers
    Returns list of dictionaries representing rows
    """
    try:
        # Create file-like object from string
        csv_file = io.StringIO(csv_content)
        
        # Read CSV
        reader = csv.DictReader(csv_file)
        
        # Validate headers
        headers = reader.fieldnames if reader.fieldnames else []
        missing_headers = [h for h in required_headers if h not in headers]
        
        if missing_headers:
            raise CSVParseError(f"Missing required headers: {', '.join(missing_headers)}")
        
        # Parse rows
        rows = []
        for row_num, row in enumerate(reader, start=2):  # start=2 because row 1 is headers
            # Skip empty rows
            if not any(row.values()):
                continue
                
            # Check for missing required values
            missing_values = [h for h in required_headers if not row.get(h, '').strip()]
            if missing_values:
                raise CSVParseError(f"Missing required values in row {row_num}: {', '.join(missing_values)}")
                
            rows.append(row)
            
        return rows
        
    except csv.Error as e:
        raise CSVParseError(f"Error parsing CSV: {str(e)}")

def parse_students_csv(csv_content: str) -> List[Dict[str, Any]]:
    """Parse and validate student CSV data"""
    required_headers = ['Name', 'Email']
    rows = parse_csv_content(csv_content, required_headers)
    
    validated_rows = []
    for row_num, row in enumerate(rows, start=2):
        # Validate email format
        if not validate_email(row['Email']):
            raise CSVParseError(f"Invalid email format in row {row_num}: {row['Email']}")
            
        validated_rows.append({
            'Name': row['Name'].strip(),
            'Email': row['Email'].strip(),
            'Class Group': row.get('Class Group', '').strip()  # Optional field
        })
        
    return validated_rows

def parse_subjects_csv(csv_content: str) -> List[Dict[str, Any]]:
    """Parse and validate subject CSV data"""
    required_headers = ['Name', 'Credit Value', 'Academic Year']
    rows = parse_csv_content(csv_content, required_headers)
    
    validated_rows = []
    for row_num, row in enumerate(rows, start=2):
        # Validate credit value
        try:
            credit_value = int(row['Credit Value'])
            if credit_value < 0 or credit_value > 100:
                raise ValueError
        except ValueError:
            raise CSVParseError(f"Invalid credit value in row {row_num}: {row['Credit Value']}")
        
        # Validate subject type
        subject_type = row.get('Type', 'other').lower().strip()
        if subject_type not in ['core', 'optional', 'short', 'other']:
            subject_type = 'other'
            
        validated_rows.append({
            'Name': row['Name'].strip(),
            'Credit Value': credit_value,
            'Type': subject_type,
            'Academic Year': row['Academic Year'].strip()
        })
        
    return validated_rows

def parse_teachers_csv(csv_content: str) -> List[Dict[str, Any]]:
    """Parse and validate teacher CSV data"""
    required_headers = ['Name', 'Email']
    rows = parse_csv_content(csv_content, required_headers)
    
    validated_rows = []
    for row_num, row in enumerate(rows, start=2):
        # Validate email format
        if not validate_email(row['Email']):
            raise CSVParseError(f"Invalid email format in row {row_num}: {row['Email']}")
            
        # Parse is_admin field
        is_admin = row.get('Is Admin', '').lower().strip()
        is_admin = is_admin in ['yes', 'true', '1', 'y']
            
        validated_rows.append({
            'Name': row['Name'].strip(),
            'Email': row['Email'].strip(),
            'Is Admin': is_admin
        })
        
    return validated_rows
