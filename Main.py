from flask import Flask , request, render_template, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
from flask_httpauth import HTTPBasicAuth
import hashlib

client = MongoClient('localhost', 27017)
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