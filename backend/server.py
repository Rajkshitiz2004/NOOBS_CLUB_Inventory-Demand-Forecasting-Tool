import json
import io
import csv
from http.server import HTTPServer, BaseHTTPRequestHandler
import database
import forecasting

class RequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        if self.path == '/skus':
            try:
                skus = database.get_skus()
                stats = database.get_global_stats()
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "skus": skus,
                    "global_stats": stats
                }).encode())
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        if self.path == '/upload':
            try:
                boundary = self.headers['Content-Type'].split('boundary=')[1].encode()
                parts = body.split(boundary)
                csv_data = None
                for part in parts:
                    if b'text/csv' in part or b'filename=' in part:
                        csv_data = part.split(b'\r\n\r\n')[1].rsplit(b'\r\n', 1)[0]
                        break
                stream = io.StringIO(csv_data.decode('utf-8'))
                reader = csv.DictReader(stream)
                data_to_insert = [(row['Date'], row['SKU'], int(row['Units_Sold'])) for row in reader]
                database.insert_sales(data_to_insert)
                self._set_headers(200)
                stats = database.get_global_stats()
                self.wfile.write(json.dumps({
                    "skus": database.get_skus(),
                    "global_stats": stats
                }).encode())
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif self.path == '/forecast':
            import traceback
            req_data = json.loads(body.decode('utf-8'))
            try:
                res = forecasting.perform_forecast(database.get_sales_by_sku(req_data['sku']), req_data['forecast_days'])
                res['sku'] = req_data['sku']
                self._set_headers(200)
                self.wfile.write(json.dumps(res).encode())
            except Exception as e:
                print(f"FORCAST ERROR: {e}")
                traceback.print_exc()
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode())

if __name__ == '__main__':
    database.init_db()
    print("Backend server starting at http://localhost:8000")
    HTTPServer(('', 8000), RequestHandler).serve_forever()
