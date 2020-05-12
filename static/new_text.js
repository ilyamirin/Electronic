const editor = new EditorJS({
    /**
    * Id of Element that should contain Editor instance
    */
    holder: 'editorjs',
    /**
    * Available Tools list.
    * Pass Tool's class or Settings object for each Tool you want to use
    */
    tools: {
        header: {
            class: Header,
            inlineToolbar: ['link'],
            config: {
                placeholder: 'Enter a header',
                levels: [2, 3, 4],
                defaultLevel: 3
            }
        },
        list: {
            class: List,
            inlineToolbar: true
        }
    },
});

$.when( $.ready ).then(function() {
    $(".save-result-button").click(function() {
        var resultToSave = {
            'body': $(".codex-editor__redactor").text()
        }
        console.log(resultToSave)
        $.post('/text/add', resultToSave, function(result) {
            if (result.objectId.length > 0) {
                alert("Сохранено!")
            } else {
                alert("Не работает!")
            }
        });
    });
});
