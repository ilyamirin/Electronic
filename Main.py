from flask import Flask, request, render_template, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
from flask_httpauth import HTTPBasicAuth
import hashlib
import os

self_host = os.environ.get("ELECTRONIC_SELF_HOST", default="localhost")

mongo_uri = os.environ.get("ELECTRONIC_URI", default="localhost")
client = MongoClient(mongo_uri)
db = client.electronic

app = Flask(__name__)

auth = HTTPBasicAuth()


def get_errors():
    errors_collection = db.errors
    errors = errors_collection.find()
    return errors


@auth.verify_password
def verify_password(username, password):
    users_collection = db.users
    user = users_collection.find_one({"username": username, "password": hashlib.sha256(password.encode('utf-8')).hexdigest()})
    if user is not None:
        return True
    else:
        return False


@app.route('/')
@app.route('/text')
@app.route('/text/<text_id>')
@auth.login_required
def main(text_id=None):
    texts_collection = db.texts
    text = None
    if text_id is not None:
        text = texts_collection.find_one({"_id": ObjectId(text_id)})
    else:
        text = texts_collection.find_one({"edited": {"$lt": 3}})
    return render_template('text.html', text=text, errors=get_errors())


@app.route('/markup/add', methods=['POST'])
@auth.login_required
def add_markup():
    form = {'sourceTextId': request.form["sourceTextId"], 'markedText': request.form["markedText"],
            'ts': datetime.utcnow(), 'username': auth.current_user()}
    markups_collection = db.markups
    texts_collection = db.texts
    result = markups_collection.insert_one(form)
    texts_collection.update_one({"_id": ObjectId(request.form["sourceTextId"])}, {"$inc": {"edited": 1}})
    return jsonify({'objectId': str(result.inserted_id)})


@app.route('/text/add', methods=['POST'])
@auth.login_required
def add_text():
    form = {'body': request.form["body"], 'edited': 0,
            'ts': datetime.utcnow(), 'username': auth.current_user()}
    texts_collection = db.texts
    result = texts_collection.insert_one(form)
    return jsonify({'objectId': str(result.inserted_id)})


@app.route('/text/new')
def new_text():
    return render_template('new_text.html')


if __name__ == '__main__':
    app.run(host=self_host, port=80)
