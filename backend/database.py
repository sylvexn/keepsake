import sqlite3
import os
import logging
from datetime import datetime

# DATABASE_PATH will be imported from app.py

def init_db():
    """Initialize the database with required tables if they don't exist."""
    conn = None
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Create images table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_filename TEXT,
            saved_filename TEXT NOT NULL,
            url TEXT NOT NULL,
            file_extension TEXT,
            file_size INTEGER,
            upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            additional_metadata TEXT
        )
        ''')
        
        # Create logs table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            source TEXT,
            details TEXT
        )
        ''')
        
        # Create errors table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS errors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            severity TEXT NOT NULL,
            message TEXT NOT NULL,
            resolved BOOLEAN DEFAULT FALSE,
            details TEXT
        )
        ''')
        
        conn.commit()
        logging.info("Database initialized successfully")
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        logging.error(f"Database initialization error: {e}")
        add_error("Database initialization error", str(e), "critical")
    finally:
        if conn:
            conn.close()

def get_db_connection():
    """Get a database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def add_image(original_filename, saved_filename, url, file_extension, file_size, additional_metadata=None):
    """Add a new image entry to the database."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO images (original_filename, saved_filename, url, file_extension, file_size, additional_metadata)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (original_filename, saved_filename, url, file_extension, file_size, additional_metadata))
        conn.commit()
        logging.info(f"Added image to database: {saved_filename}")
        return cursor.lastrowid
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        logging.error(f"Database error when adding image: {e}")
        add_error("Database error when adding image", str(e), "medium")
        return None
    finally:
        if conn:
            conn.close()

def get_images(page=1, per_page=20, filters=None):
    """Get paginated list of images with optional filters."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM images"
        params = []
        
        if filters:
            where_clauses = []
            
            if 'file_extension' in filters and filters['file_extension']:
                where_clauses.append("file_extension = ?")
                params.append(filters['file_extension'])
            
            if 'filename' in filters and filters['filename']:
                where_clauses.append("(original_filename LIKE ? OR saved_filename LIKE ?)")
                params.extend([f"%{filters['filename']}%", f"%{filters['filename']}%"])
            
            if 'date_from' in filters and filters['date_from']:
                where_clauses.append("upload_timestamp >= ?")
                params.append(filters['date_from'])
            
            if 'date_to' in filters and filters['date_to']:
                where_clauses.append("upload_timestamp <= ?")
                params.append(filters['date_to'])
            
            if 'min_size' in filters and filters['min_size']:
                where_clauses.append("file_size >= ?")
                params.append(filters['min_size'])
            
            if 'max_size' in filters and filters['max_size']:
                where_clauses.append("file_size <= ?")
                params.append(filters['max_size'])
            
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
        
        # Add sorting
        sort_by = filters.get('sort_by', 'upload_timestamp') if filters else 'upload_timestamp'
        sort_order = filters.get('sort_order', 'DESC') if filters else 'DESC'
        
        query += f" ORDER BY {sort_by} {sort_order}"
        
        # Add pagination
        offset = (page - 1) * per_page
        query += " LIMIT ? OFFSET ?"
        params.extend([per_page, offset])
        
        cursor.execute(query, params)
        images = [dict(row) for row in cursor.fetchall()]
        
        # Get total count for pagination
        count_query = "SELECT COUNT(*) as count FROM images"
        if 'WHERE' in query:
            count_query += " " + query.split('ORDER BY')[0].split('WHERE')[1]
            cursor.execute(count_query, params[:-2] if params else [])
        else:
            cursor.execute(count_query)
        
        total = cursor.fetchone()['count']
        
        return {
            'images': images,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    except sqlite3.Error as e:
        logging.error(f"Database error when getting images: {e}")
        add_error("Database error when getting images", str(e), "medium")
        return {'images': [], 'total': 0, 'page': page, 'per_page': per_page, 'total_pages': 0}
    finally:
        if conn:
            conn.close()

def get_image(image_id):
    """Get a specific image by ID."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM images WHERE id = ?", (image_id,))
        image = cursor.fetchone()
        return dict(image) if image else None
    except sqlite3.Error as e:
        logging.error(f"Database error when getting image {image_id}: {e}")
        add_error(f"Database error when getting image {image_id}", str(e), "medium")
        return None
    finally:
        if conn:
            conn.close()

def delete_image(image_id):
    """Delete an image by ID."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT saved_filename FROM images WHERE id = ?", (image_id,))
        image = cursor.fetchone()
        
        if not image:
            return False
        
        cursor.execute("DELETE FROM images WHERE id = ?", (image_id,))
        conn.commit()
        logging.info(f"Deleted image from database: {image['saved_filename']}")
        return True
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        logging.error(f"Database error when deleting image {image_id}: {e}")
        add_error(f"Database error when deleting image {image_id}", str(e), "medium")
        return False
    finally:
        if conn:
            conn.close()

def add_log(level, message, source=None, details=None):
    """Add a new log entry to the database."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO logs (level, message, source, details)
        VALUES (?, ?, ?, ?)
        ''', (level, message, source, details))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        logging.error(f"Database error when adding log: {e}")
        # Don't call add_error here to avoid potential infinite recursion
        return None
    finally:
        if conn:
            conn.close()

def get_logs(page=1, per_page=50, filters=None):
    """Get paginated logs with optional filters."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM logs"
        params = []
        
        if filters:
            where_clauses = []
            
            if 'level' in filters and filters['level']:
                where_clauses.append("level = ?")
                params.append(filters['level'])
            
            if 'search' in filters and filters['search']:
                where_clauses.append("(message LIKE ? OR details LIKE ?)")
                search_term = f"%{filters['search']}%"
                params.extend([search_term, search_term])
            
            if 'date_from' in filters and filters['date_from']:
                where_clauses.append("timestamp >= ?")
                params.append(filters['date_from'])
            
            if 'date_to' in filters and filters['date_to']:
                where_clauses.append("timestamp <= ?")
                params.append(filters['date_to'])
            
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
        
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([per_page, (page - 1) * per_page])
        
        cursor.execute(query, params)
        logs = [dict(row) for row in cursor.fetchall()]
        
        # Get total count for pagination
        count_query = "SELECT COUNT(*) as count FROM logs"
        if 'WHERE' in query:
            count_query += " " + query.split('ORDER BY')[0].split('WHERE')[1]
            cursor.execute(count_query, params[:-2] if params else [])
        else:
            cursor.execute(count_query)
        
        total = cursor.fetchone()['count']
        
        return {
            'logs': logs,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    except sqlite3.Error as e:
        logging.error(f"Database error when getting logs: {e}")
        # Don't call add_error here to avoid potential infinite recursion
        return {'logs': [], 'total': 0, 'page': page, 'per_page': per_page, 'total_pages': 0}
    finally:
        if conn:
            conn.close()

def add_error(message, details=None, severity="medium"):
    """Add a new error entry to the database."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO errors (severity, message, details)
        VALUES (?, ?, ?)
        ''', (severity, message, details))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        logging.error(f"Database error when adding error: {e}")
        return None
    finally:
        if conn:
            conn.close()

def get_errors(page=1, per_page=20, include_resolved=False):
    """Get paginated error notifications."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM errors"
        params = []
        
        if not include_resolved:
            query += " WHERE resolved = 0"
        
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([per_page, (page - 1) * per_page])
        
        cursor.execute(query, params)
        errors = [dict(row) for row in cursor.fetchall()]
        
        # Get total count for pagination
        count_query = "SELECT COUNT(*) as count FROM errors"
        if not include_resolved:
            count_query += " WHERE resolved = 0"
        
        cursor.execute(count_query)
        total = cursor.fetchone()['count']
        
        return {
            'errors': errors,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    except sqlite3.Error as e:
        logging.error(f"Database error when getting errors: {e}")
        return {'errors': [], 'total': 0, 'page': page, 'per_page': per_page, 'total_pages': 0}
    finally:
        if conn:
            conn.close()

def resolve_error(error_id):
    """Mark an error as resolved."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE errors SET resolved = 1 WHERE id = ?", (error_id,))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        logging.error(f"Database error when resolving error {error_id}: {e}")
        return False
    finally:
        if conn:
            conn.close()

def get_stats():
    """Get usage statistics for the dashboard."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total uploads
        cursor.execute("SELECT COUNT(*) as total FROM images")
        total_uploads = cursor.fetchone()['total']
        
        # Total storage used
        cursor.execute("SELECT SUM(file_size) as total_size FROM images")
        total_size = cursor.fetchone()['total_size'] or 0
        
        # Uploads by day (last 7 days)
        cursor.execute("""
        SELECT COUNT(*) as count, DATE(upload_timestamp) as date
        FROM images
        WHERE upload_timestamp >= DATE('now', '-7 days')
        GROUP BY DATE(upload_timestamp)
        ORDER BY date
        """)
        daily_uploads = [dict(row) for row in cursor.fetchall()]
        
        # File type distribution
        cursor.execute("""
        SELECT file_extension, COUNT(*) as count
        FROM images
        GROUP BY file_extension
        ORDER BY count DESC
        """)
        file_types = [dict(row) for row in cursor.fetchall()]
        
        # Recent error count
        cursor.execute("SELECT COUNT(*) as count FROM errors WHERE resolved = 0")
        error_count = cursor.fetchone()['count']
        
        return {
            'total_uploads': total_uploads,
            'total_size': total_size,
            'daily_uploads': daily_uploads,
            'file_types': file_types,
            'error_count': error_count
        }
    except sqlite3.Error as e:
        logging.error(f"Database error when getting stats: {e}")
        add_error("Database error when getting stats", str(e), "medium")
        return {
            'total_uploads': 0,
            'total_size': 0,
            'daily_uploads': [],
            'file_types': [],
            'error_count': 0
        }
    finally:
        if conn:
            conn.close() 