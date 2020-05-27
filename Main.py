from flask import Flask, request, render_template, json
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
from flask_httpauth import HTTPBasicAuth
import hashlib
import os

self_host = os.environ.get("ELECTRONIC_SELF_HOST", default="localhost")

mongo_uri = os.environ.get("ELECTRONIC_URI", default='mongodb://ilyam:efgerwtghretbthg@178.62.199.200:27017/admin?authSource=electronic&readPreference=primary&appname=MongoDB%20Compass&ssl=false')
client = MongoClient(mongo_uri)
db = client.electronic

application = Flask(__name__)

auth = HTTPBasicAuth()


def get_errors():
    errors_collection = db.errors
    result = dict()
    for error in errors_collection.find():
        criterion = error['criterion']
        code = error['code']
        comment = error['comment']
        if comment == '':
            comment = code
        if result.get(criterion) is None:
            result[criterion] = dict()
        if result.get(criterion).get(code) is None:
            result[criterion][code] = dict()
        if result.get(criterion).get(code).get(comment) is None:
            result[criterion][code][comment] = {'description': error['description'], '_id': str(error['_id'])}
    return result


@auth.verify_password
def verify_password(username, password):
    users_collection = db.users
    user = users_collection.find_one({"username": username, "password": hashlib.sha256(password.encode('utf-8')).hexdigest()})
    if user is not None:
        return True
    else:
        return False


@application.route('/')
@application.route('/text')
@application.route('/text/<text_id>')
@auth.login_required
def main(text_id=None):
    texts_collection = db.texts
    if text_id is not None:
        text = texts_collection.find_one({"_id": ObjectId(text_id)})
    else:
        username_equal_current = {'username': auth.current_user()}
        ids = list(db.markups.find(username_equal_current, {'sourceTextId': 1}))
        edited_lesser_then_3 = {"edited": {"$lt": 3}}
        id_not_in = {'_id': {'$not': {"$in": list(map(lambda i: ObjectId(i['sourceTextId']), ids))}}}
        text = texts_collection.find_one({"$and": [id_not_in, edited_lesser_then_3]})
    return render_template('text.html', text=text, errors=get_errors(), user=auth.current_user())


@application.route('/markup/add', methods=['POST'])
@auth.login_required
def add_markup():
    print(request.form)
    form = {'sourceTextId': request.form["sourceTextId"], 'markedText': request.form["markedText"],
            'mistakes': json.loads(request.form["mistakes"]),
            'ts': datetime.utcnow(), 'username': auth.current_user()}
    markups_collection = db.markups
    texts_collection = db.texts
    result = markups_collection.insert_one(form)
    texts_collection.update_one({"_id": ObjectId(request.form["sourceTextId"])}, {"$inc": {"edited": 1}})
    return json.jsonify({'objectId': str(result.inserted_id)})


@application.route('/text/add', methods=['POST'])
@auth.login_required
def add_text():
    form = {'body': request.form["body"], 'edited': 0,
            'ts': datetime.utcnow(), 'username': auth.current_user()}
    texts_collection = db.texts
    result = texts_collection.insert_one(form)
    return json.jsonify({'objectId': str(result.inserted_id)})


@application.route('/text/new')
@auth.login_required
def new_text():
    return render_template('new_text.html')


if __name__ == '__main__':
    application.run(host=self_host, port=80)
