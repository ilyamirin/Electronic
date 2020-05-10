
$.when( $.ready ).then(function() {
    function getSelectionText() {
        if (window.getSelection) {
            return window.getSelection().toString();
        } else if (document.selection && document.selection.type != "Control") {
            return document.selection.createRange().text;
        }
    }

    function markByRule(textToMark, errorCode, errorComment, description, replacement) {
        var result = '(\\ ' + errorCode + ' ' + errorComment + ' \\ ' + textToMark + ' :: ' + description + ' >> ' + replacement + ' \\)'
        return result
    }

    function createNewMistake() {
        var errorCode =  $("input#errorCode").val()
        var errorComment = $("input#errorComment").val().trim()
        var errorDescription = $("#errorDescription").val().trim()
        var selectedText = $("input#selectedText").val()
        var replacement = $("#replacement").val()

        var markedText = $(".marked-text").html().replace(selectedText, markByRule(selectedText, errorCode, errorComment, errorDescription, replacement))
        $(".marked-text").html(markedText)
        //console.log(markedText)
    }

    var sourceText = $(".source-text").html()

    dialog = $( "#dialog-form" ).dialog({
        autoOpen: false,
        height: 300,
        width: 500,
        modal: true,
        buttons: {
            "Create new mistake": createNewMistake,
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
