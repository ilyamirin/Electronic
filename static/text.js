
$.when( $.ready ).then(function() {
    function nl2br(str){
        result = ''
        str.split(/(?:\r\n|\r|\n)/g).forEach(function(block) {
            result += '<p>' + block + '</p>'
        })
        return result
    }

    function getSelectionText() {
        if (window.getSelection) {
            return {
                'text': window.getSelection().toString(),
                'start': window.getSelection().anchorOffset,
                'finish': window.getSelection().focusOffset,
            }
        } else if (document.selection && document.selection.type != "Control") {
            return document.selection.createRange().text;
        }
    }

    function markByRule(textToMark, errorCode, errorComment, description, replacement, tag) {
        var result = '(\\ ' + errorCode + ' ' + errorComment + ' \\ ' + textToMark
        if (description.length > 0) {
            result += ' :: ' + description
        }
        if (replacement.length > 0) {
            result += ' >> ' + replacement
        }
        if (tag.length > 0) {
            result += ' # ' + tag
        }
        result += ' \\)'
        return result
    }

    function markAndHightlightByRule(m) {
        var result = '<code style="color:red">(\\ ' + m.errorCode + ' </code><code style="color:green">' + m.errorComment + ' \\</code> ' + m.selectedText
        if (m.errorDescription.length > 0) {
            result += ' <code style="color:green">:: ' + m.errorDescription + '</code>'
        }
        if (m.replacement.length > 0) {
            result += ' <code style="color:brown">>> ' + m.replacement + ' </code>'
        }
        if (m.errorTag.length > 0) {
            result += ' <code style="color:blue"># ' + m.errorTag + ' </code>'
        }
        result += ' <code style="color:red">\\)</code>'
        return result
    }

    var text = $(".marked-text").text()
    var mistakes = []

    $('.text-body').html(nl2br($('.text-body').html()))

    function createNewMistake() {
        var mistake = {
            errorCode: $("input#errorCode").val(),
            errorComment: $("input#errorComment").val().trim(),
            errorDescription: $("#errorDescription").val().trim(),
            selectedText: $("input#selectedText").val(),
            selectedTextStart: $("input#selectedTextStart").val(),
            selectedTextFinish: $("input#selectedTextFinish").val(),
            replacement: $("#replacement").val(),
            errorTag: $("#errorTag").val(),
        }

        if (mistake.selectedText.length > 0) {
            mistakes.push(mistake)
            mistakes.sort(function(a, b) { return a.selectedTextStart - b.selectedTextStart})

            console.log(mistakes)

            textForEdition = text
            textForMarkup = text
            $('.mistakes-table-body').html('')
            i = mistakes.length
            mistakes.forEach(function(m) {
                textForEdition = textForEdition.replace(m.selectedText, '<code style="color:red">'+m.selectedText+'</code>')
                textForMarkup = textForMarkup.replace(m.selectedText, markAndHightlightByRule(m))

                $('.mistakes-table-body').append('<tr><td>' + i-- + '</td><td>' + m.errorCode + '</td><td>' + m.errorComment + '</td></tr>');
            })

            $(".source-text").html(nl2br(textForEdition))
            $(".marked-text").html(nl2br(textForMarkup))
        }
    }

    dialog = $( "#dialog-form" ).dialog({
        autoOpen: false,
        height: 600,
        width: 500,
        modal: true,
        buttons: {
            "Разметить ошибку": function() {
                createNewMistake();
                dialog.dialog( "close" );
            },
            Cancel: function() {
              dialog.dialog( "close" );
            }
        },
        close: function() {
            form[ 0 ].reset();
        }
    });

    $(".error-button").click(function() {
        var errorId = $(this).attr("id")
        var errorCode = $(this).attr("code")
        var errorComment = $(this).text()
        var errorDescription = $(this).attr("title")
        var selectedText = getSelectionText()

        $("input#id").val(errorId)
        $("input#errorCode").val(errorCode)
        if(errorCode != errorComment) { $("input#errorComment").val(errorComment) }
        $("#errorDescription").val(errorDescription)
        $("input#selectedText").val(selectedText.text)
        $("input#selectedTextStart").val(selectedText.start)
        $("input#selectedTextFinish").val(selectedText.finish)

        dialog.dialog( "open" );
    })

    form = dialog.find( "form" ).on( "submit", function( event ) {
        event.preventDefault();
    });

    $(".save-result-button").click(function() {
        var markupToSave = {
            'sourceTextId': $(".source-text").attr("id"),
            'markedText': text,
            'mistakes': JSON.stringify(mistakes),
        }
        $.post('/markup/add', markupToSave, function(result) {
            console.log(result)
            if (result.objectId.length > 0) {
                alert("Сохранено! Нажмите кнопку \"Следующий\" для перехода к следующему тексту.")
            } else {
                alert("Не работает! Пишите администратору!")
            }
        });
    });
});
