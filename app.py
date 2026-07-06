import os
import re
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_html_content(html):
    # Split content by <h3> tags, associating each with its content
    # Note that BigQuery release notes contain <h3>[Type]</h3> followed by <p>...</p> blocks.
    pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL | re.IGNORECASE)
    matches = pattern.findall(html)
    
    updates = []
    for match in matches:
        update_type = match[0].strip()
        update_content = match[1].strip()
        updates.append({
            'type': update_type,
            'content': update_content
        })
    
    # Fallback if no <h3> tags are found (though normally they should be)
    if not updates:
        updates.append({
            'type': 'Update',
            'content': html.strip()
        })
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        # Fetch the feed
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse XML
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(response.content)
        
        feed_title = root.find('atom:title', namespaces)
        feed_title_text = feed_title.text if feed_title is not None else "BigQuery Release Notes"
        
        feed_updated = root.find('atom:updated', namespaces)
        feed_updated_text = feed_updated.text if feed_updated is not None else ""
        
        entries = []
        for entry in root.findall('atom:entry', namespaces):
            title = entry.find('atom:title', namespaces)
            date_str = title.text if title is not None else "Unknown Date"
            
            entry_id = entry.find('atom:id', namespaces)
            entry_id_text = entry_id.text if entry_id is not None else ""
            
            updated = entry.find('atom:updated', namespaces)
            updated_text = updated.text if updated is not None else ""
            
            link_elem = entry.find("atom:link[@rel='alternate']", namespaces)
            link = link_elem.attrib.get('href') if link_elem is not None else ""
            
            content_elem = entry.find('atom:content', namespaces)
            content_html = content_elem.text if content_elem is not None else ""
            
            updates = parse_html_content(content_html)
            
            entries.append({
                'date': date_str,
                'id': entry_id_text,
                'updated': updated_text,
                'link': link,
                'updates': updates
            })
            
        return jsonify({
            'success': True,
            'title': feed_title_text,
            'updated': feed_updated_text,
            'entries': entries
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': f"Failed to fetch release notes: {str(e)}"
        }), 502
    except ET.ParseError as e:
        return jsonify({
            'success': False,
            'error': f"Failed to parse release notes XML: {str(e)}"
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"An unexpected error occurred: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Using 5001 because port 5000 is often in use by macOS Control Center / AirPlay Receiver
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting server on http://localhost:{port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
