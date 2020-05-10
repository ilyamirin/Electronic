from flask import Flask, escape, request, render_template
from pymongo import MongoClient
from bson.objectid import ObjectId

client = MongoClient('localhost', 27017)
db = client.electronic

app = Flask(__name__)

def get_errors():
    errors_collection = db.errors
    errors = errors_collection.find()
    return errors


@app.route('/')
@app.route('/text')
@app.route('/text/<text_id>')
def main(text_id=None):
    texts_collection = db.texts
    text = None
    if text_id is not None:
        text = texts_collection.find_one({"_id": ObjectId(text_id)})
    else:
        text = texts_collection.find_one({"edited": {"$lt": 3}})
    #name = request.args.get("name", "World")
    print(text)
    return render_template('text.html', text=text, errors=get_errors())
