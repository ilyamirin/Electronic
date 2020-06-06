import hashlib
import os
import re
from datetime import datetime
from random import sample
from zipfile import ZipFile

from bson.objectid import ObjectId
from flask import Flask, request, render_template, render_template_string, json
from flask_httpauth import HTTPBasicAuth
from pymongo import MongoClient

self_host = os.environ.get("ELECTRONIC_SELF_HOST", default="localhost")

mongo_uri = os.environ.get("ELECTRONIC_URI",
                           default='mongodb://ilyam:efgerwtghretbthg@178.62.199.200:27017/admin?authSource=electronic&readPreference=primary&appname=MongoDB%20Compass&ssl=false')
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
    user = users_collection.find_one(
        {"username": username, "password": hashlib.sha256(password.encode('utf-8')).hexdigest()})
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
        markups_aggregation = db.markups.aggregate([
            {
                '$group': {
                    '_id': '$sourceTextId',
                    'ts': {
                        '$push': '$ts'
                    },
                    'editors': {
                        '$addToSet': '$username'
                    }
                }
            }, {
                '$project': {
                    '_id': '$_id',
                    'size_ts': {
                        '$size': '$ts'
                    },
                    'editors': '$editors'
                }
            }, {
                '$match': {
                    '$and': [
                        {
                            'size_ts': {
                                '$lt': 3
                            }
                        }, {
                            'editors': {
                                '$elemMatch': {
                                    '$ne': auth.current_user()
                                }
                            }
                        }
                    ]
                }
            }])

        text_id = sample(list(markups_aggregation), 1)[0]["_id"]
        text = texts_collection.find_one({"_id": ObjectId(text_id)})

    body_split = text['body'].split()
    words_counter = len(body_split)
    if text.get('theme') is None or text['theme'] == '':
        text['theme'] = u' '.join(body_split[:5]) + '...'

    return render_template('text.html', text=text, errors=get_errors(), user=auth.current_user(),
                           words_counter=words_counter)


@application.route('/markup/add', methods=['POST'])
@auth.login_required
def add_markup():
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


@application.route('/markups')
@auth.login_required
def markups():
    markups_collection = db.markups
    aggregated_markups = markups_collection.aggregate([
        {
            '$group': {
                '_id': '$sourceTextId',
                'ts': {
                    '$push': {
                        'username': '$username',
                        'ts': '$ts',
                        'markup_id': '$_id'
                    }
                }
            }
        }, {
            '$unwind': {
                'path': '$ts'
            }
        }
    ])

    result = {}
    for markup in aggregated_markups:
        key = markup['_id'] + markup['ts']['username']
        if result.get(key) is None:
            result[key] = markup
        elif result[key]['ts']['ts'].timestamp() < markup['ts']['ts'].timestamp():
            result[key] = markup
    markup_ids = list(map(lambda m: m['ts']['markup_id'], result.values()))

    result = sorted(list(markups_collection.find({'_id': {'$in': markup_ids}})), key=lambda mr: mr['ts'].timestamp(), reverse=True)
    return render_template('markups.html', markups=result, user=auth.current_user())


def mark_by_rule(m):
    result = '(\\ ' + m['errorCode'] + ' ' + m['errorComment'] + ' \\ ' + m['selectedText']
    if len(m['errorDescription']) > 0:
        result += ' :: ' + m['errorDescription']
    if len(m['replacement']) > 0:
        result += ' >> ' + m['replacement'] + ' '
    if len(m['errorTag']) > 0:
        result += ' # ' + m['errorTag'] + ' '
    result += ' \\)'
    return result


def mark_and_highlight_by_rule(m):
    result = '<code style="color:red">(\\ ' + m['errorCode'] + ' </code><code style="color:green">' + m[
        'errorComment'] + " \\</code> " + m['selectedText']
    if len(m['errorDescription']) > 0:
        result += ' <code style="color:darkblue">:: ' + m['errorDescription'] + ' </code>'
    if len(m['replacement']) > 0:
        result += ' <code style="color:brown">>> ' + m['replacement'] + ' </code>'
    if len(m['errorTag']) > 0:
        result += ' <code style="color:blue"># ' + m['errorTag'] + ' </code>'
    result += ' <code style="color:red">\\)</code>'
    return result


@application.route('/get/file/<markup_id>')
@auth.login_required
def get_file(markup_id=None):
    markup = db.markups.find_one({'_id': ObjectId(markup_id)})
    editor = db.users.find_one({'username': markup['username']})
    text = markup['markedText']

    blocks = text.split('\n')

    for mistake in sorted(markup['mistakes'], key=lambda m: len(m['selectedText']), reverse=True):
        block = blocks[mistake['selectedTextBlock']]
        for match in re.finditer(mistake['selectedText'].strip(), block):
            pointer = min(int(mistake['selectedTextStart']), int(mistake['selectedTextFinish']))
            if match.start() >= pointer:
                blocks[mistake['selectedTextBlock']] = block.replace(mistake['selectedText'],
                                                                     mark_and_highlight_by_rule(mistake), 1)
                break

    markup['markedText'] = '<br><br>'.join(blocks)
    return render_template_string('{{ markup.markedText|safe }}', markup=markup, editor=editor,
                                  user=auth.current_user())


@application.route('/download/file')
@auth.login_required
def download_file():
    ids = request.args.getlist('ids[]')
    print(ids)
    files = []
    for markup_id in ids:
        markup = db.markups.find_one({'_id': ObjectId(markup_id)})
        editor = db.users.find_one({'username': markup['username']})
        origin = db.texts.find_one({'_id': ObjectId(markup['sourceTextId'])})

        text = markup['markedText']
        blocks = text.split('\n')

        for mistake in sorted(markup['mistakes'], key=lambda m: len(m['selectedText']), reverse=True):
            block = blocks[mistake['selectedTextBlock']]
            for match in re.finditer(mistake['selectedText'].strip(), block):
                pointer = min(int(mistake['selectedTextStart']), int(mistake['selectedTextFinish']))
                if match.start() >= pointer:
                    blocks[mistake['selectedTextBlock']] = block.replace(mistake['selectedText'], mark_by_rule(mistake), 1)
                    break

        theme = origin['theme']
        if theme is None or len(theme) == 0:
            theme = u'_'.join(text.split()[:5])
        theme = theme.replace(' ', '_').replace('.', '').replace('?', '').replace('!', '').replace(',', '')

        number = int(re.findall('^[0-9]+', origin['name'])[0])
        filename = "%(number)d_en_%(theme)s_%(expert)s.txt" % {"expert": editor['code'], 'theme': theme,
                                                               'number': number}
        f = open(filename, "w+")
        for block in blocks:
            f.write("%s\r\n" % block)
        f.close()
        files.append(filename)

    zipfile = 'static%s%d.zip' % (os.path.sep, datetime.utcnow().timestamp())
    zipObj = ZipFile(zipfile, 'w')
    for filename in files:
        zipObj.write(filename)
    zipObj.close()

    for filename in files:
        if os.path.exists(filename):
            os.remove(filename)

    return json.jsonify({'success': True, 'zipfile': zipfile.split(os.path.sep)[-1]})


@application.route('/logout')
def logout():
    return "Logout", 401


if __name__ == '__main__':
    application.run(host=self_host, port=5000, debug=True)
