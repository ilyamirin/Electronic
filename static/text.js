
$.when( $.ready ).then(function() {
    function getSelectionText() {
        if (window.getSelection) {
            return window.getSelection().toString();
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
        console.log(result)
        return result
    }

    function markAndHightlightByRule(textToMark, errorCode, errorComment, description, replacement, tag) {
        var result = '<code style="color:red">(\\ ' + errorCode + ' </code><code style="color:green">' + errorComment + ' \\</code> ' + textToMark
        if (description.length > 0) {
            result += ' <code style="color:green">:: ' + description + '</code>'
        }
        if (replacement.length > 0) {
            result += ' <code style="color:brown">>> ' + replacement + ' </code>'
        }
        if (tag.length > 0) {
            result += ' <code style="color:blue"># ' + tag + ' </code>'
        }
        result += ' <code style="color:red">\\)</code>'
        return result
    }

    var markedText = $(".marked-text").html()

    function createNewMistake() {
        var errorCode =  $("input#errorCode").val()
        var errorComment = $("input#errorComment").val().trim()
        var errorDescription = $("#errorDescription").val().trim()
        var selectedText = $("input#selectedText").val()
        var replacement = $("#replacement").val()
        var tag = $("#errorTag").val()

        if (selectedText.length > 0) {
            markedText = markedText.replace(selectedText, markByRule(selectedText, errorCode, errorComment, errorDescription, replacement, tag))
            console.log(markedText)

            $(".marked-text").html($(".marked-text").html().replace(selectedText, markAndHightlightByRule(selectedText, errorCode, errorComment, errorDescription, replacement, tag)))

            var sourceText = $(".source-text").html()
            $(".source-text").html(sourceText.replace(selectedText, '<code style="color:red">'+selectedText+'</code>'))
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
        $("input#selectedText").val(selectedText)

        dialog.dialog( "open" );
    })

    form = dialog.find( "form" ).on( "submit", function( event ) {
        event.preventDefault();
    });

    $(".save-result-button").click(function() {
        var markupToSave = {
            'sourceTextId': $(".source-text").attr("id"),
            'markedText': markedText
        }
        $.post('/markup/add', markupToSave, function(result) {
            console.log(result)
            if (result.objectId.length > 0) {
                alert("Сохранено!")
            } else {
                alert("Не работает!")
            }
        });
    });
});
