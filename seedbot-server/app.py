from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import xmltodict
import os
import paho.mqtt.client as mqtt

# Création de l'application Flask
app = Flask(__name__, static_folder='../')
CORS(app)

# Dossier où les fichiers uploadés seront sauvegardés
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Configuration MQTT
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "robot/chemin"

# Création du client MQTT
mqtt_client = mqtt.Client()

def connect_mqtt():
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
        print("Connexion au broker MQTT réussie")
    except Exception as e:
        print(f"Erreur de connexion au broker MQTT : {str(e)}")

# Connexion au broker MQTT au démarrage de l'application Flask
connect_mqtt()

@app.route('/')
def index():
    return send_from_directory('../', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../', path)

@app.route('/upload', methods=['POST'])
def upload_file():
    # Vérifier si le fichier est dans la requête
    if 'kmlFile' not in request.files:
        return 'Aucun fichier téléchargé.', 400

    file = request.files['kmlFile']
    # Vérifier si un fichier a été sélectionné
    if file.filename == '':
        return 'Aucun fichier sélectionné.', 400

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(file_path)

    # Lire le fichier KML
    try:
        with open(file_path, 'r') as f:
            kml_content = f.read()
    except Exception as e:
        return f'Erreur lors de la lecture du fichier KML : {str(e)}', 500

    # Convertir le KML en dictionnaire
    try:
        kml_dict = xmltodict.parse(kml_content)
    except Exception as e:
        return f'Erreur lors de l\'analyse du fichier KML : {str(e)}', 500

    coordinates = []

    # Extraire les coordonnées
    try:
        # Vérifier le chemin de la structure KML
        placemarks = kml_dict.get('kml', {}).get('Document', {}).get('Placemark', [])
        if not isinstance(placemarks, list):
            placemarks = [placemarks]

        for placemark in placemarks:
            if 'LineString' in placemark:
                coordinates_str = placemark['LineString']['coordinates'].strip()
                coords = coordinates_str.split()
                for coord in coords:
                    parts = coord.split(',')
                    if len(parts) >= 2:
                        lng = float(parts[0])
                        lat = float(parts[1])
                        coordinates.append({'lat': lat, 'lng': lng})

    except KeyError as e:
        return f'Erreur lors de l\'extraction des coordonnées : {str(e)}', 500

    # Supprimer le fichier après traitement
    os.remove(file_path)

    # Debug: Afficher les coordonnées extraites
    print("Coordonnées extraites : ", coordinates)

    # Publier les coordonnées sur le broker MQTT
    try:
        mqtt_client.publish(MQTT_TOPIC, str(coordinates))
        print("Coordonnées publiées sur le topic MQTT :", MQTT_TOPIC)
    except Exception as e:
        print(f"Erreur lors de la publication sur MQTT : {str(e)}")

    return jsonify(coordinates)

#if __name__ == '__main__':
    #app.run(debug=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)  # Permet l'accès externe à Flask
