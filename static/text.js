
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

    currentMistake = null

    $(".error-button").click(function() {
        var currentMistake = $(this).attr("id")
        var selectedText = getSelectionText()
        var errorCode = $(this).attr("code")
        var errorComment = $(this).attr("comment")
        var errorDescription = $(this).attr("description")

        console.log(selectedText)
        console.log(markByRule(selectedText, errorCode, errorComment, errorDescription))

        var markedText = $(".marked-text").html()
        $(".marked-text").html(markedText.replace(selectedText, markByRule(selectedText, errorCode, errorComment, errorDescription)))
    })
});
