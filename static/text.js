
$.when( $.ready ).then(function() {
    function getSelectionText() {
        if (window.getSelection) {
            return window.getSelection().toString();
        } else if (document.selection && document.selection.type != "Control") {
            return document.selection.createRange().text;
        }
    }

    function markByRule(textToMark, errorCode, errorComment, description, replacement) {
        var result = '(\\ ' + errorCode + ' ' + errorComment + ' \\ ' + textToMark
        if (description.length > 0) {
            result += ' :: ' + description
        }
        if (replacement.length > 0) {
            result += ' >> ' + replacement
        }
        result += ' \\)'
        return result
    }

    function markAndHightlightByRule(textToMark, errorCode, errorComment, description, replacement) {
        var result = '<code style="color:red">(\\ ' + errorCode + ' </code><code style="color:green">' + errorComment + ' </code>\\ ' + textToMark
        if (description.length > 0) {
            result += ' <code style="color:green">:: ' + description + '</code>'
        }
        if (replacement.length > 0) {
            result += ' <code style="color:brown">>> ' + replacement + ' </code>'
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

        if (selectedText.length > 0) {
            markedText = markedText.replace(selectedText, markByRule(selectedText, errorCode, errorComment, errorDescription, replacement))
            console.log(markedText)

            $(".marked-text").html($(".marked-text").html().replace(selectedText, markAndHightlightByRule(selectedText, errorCode, errorComment, errorDescription, replacement)))

            var sourceText = $(".source-text").html()
            $(".source-text").html(sourceText.replace(selectedText, '<code style="color:red">'+selectedText+'</code>'))

            console.log($(".source-text").attr("id"))
            var markupToSave = {
                'sourceText': $(".source-text").attr("id"),
                'markedText': markedText
            }
            $.post('/markup/add', markupToSave, function(result) { console.log(result) });
        }
    }

    dialog = $( "#dialog-form" ).dialog({
        autoOpen: false,
        height: 400,
        width: 500,
        modal: true,
        buttons: {
            "Create new mistake": function() {
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
        var errorCode = $(this).attr("code")
        var errorComment = $(this).attr("comment")
        var errorDescription = $(this).attr("description")
        var selectedText = getSelectionText()

        $("input#errorCode").val(errorCode)
        $("input#errorComment").val(errorComment)
        $("#errorDescription").val(errorDescription)
        $("input#selectedText").val(selectedText)

        dialog.dialog( "open" );
    })

    form = dialog.find( "form" ).on( "submit", function( event ) {
        event.preventDefault();
    });
});
