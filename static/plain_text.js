String.prototype.replaceBetween = function(start, end, what) {
  return this.substring(0, start) + what + this.substring(end);
};

$.when( $.ready ).then(function() {
    function nl2br(str){
        result = ''
        i = 0
        str.split(/(?:\r\n|\r|\n)/g).forEach(function(block) {
            result += '<p block="' + i++ + '">' + block + '</p>'
        })
        return result
    }

    function getSelectionText() {
        if (window.getSelection) {
            return {
                'text': window.getSelection().toString(),
                'start': window.getSelection().anchorOffset,
                'finish': window.getSelection().focusOffset,
                'block': $(window.getSelection().anchorNode).parents('p').attr("block")
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

    function showMistakes() {
            textForEdition = text
            textForMarkup = text
            $('.mistakes-table-body').html('')
            i = 0

            mistakes.forEach(function(m) {
                tr = $('.mistakes-table-body').append('<tr></tr>')
                tr.append('<td>' + i + '</td><td>' + m.errorCode + '</td><td>' + m.errorComment + '</td>');
                tr.append('<td class="mistake" i="'+ i +'">X</td')
                i++
            })

            sortedM = [...mistakes]
            sortedM.sort(function(a, b) { return - a.selectedText.length + b.selectedText.length})

            sortedM.forEach(function(m) {
                pointer = Math.min(m.selectedTextStart, m.selectedTextFinish)

                selectedText = m.selectedText.trim().replace('*', '\\*').replace('?', '\\?').replace('<', '\\<').replace('>', '\\>')

                currentBlock = textForEdition.split('\n')[m.selectedTextBlock]
                goReplace = true
                newBlock = currentBlock.replace(new RegExp(selectedText, 'g'), function(match, offset, string) {
                    if ((offset >= pointer) && goReplace) {
                        goReplace = false
                        return '<code style="color:red">'+m.selectedText+'</code>'
                    }
                    return match
                })
                textForEdition = textForEdition.replace(currentBlock, newBlock)

                goReplace = true
                currentBlock = textForMarkup.split('\n')[m.selectedTextBlock]
                newBlock = currentBlock.replace(new RegExp(selectedText, 'g'), function(match, offset, string) {
                if ((offset >= pointer) && goReplace) {
                        goReplace = false
                        return markAndHightlightByRule(m)
                    }
                    return match
                })
                textForMarkup = textForMarkup.replace(currentBlock, newBlock)
            })

            $(".source-text").html(nl2br(textForEdition))
            $(".marked-text").html(nl2br(textForMarkup))

            $(".mistake").dblclick(function (e) {
                i = $(e.target).attr('i')
                //$(".source-text").animate({color:'red'},1000);
                mistakes.splice(i, 1)
                console.log(i)
                showMistakes()
            });
    }

    $('.source-text').html(nl2br($('.source-text').html()))
    $('.marked-text').html(nl2br($('.marked-text').html()))

    $('.input-text').keypress(function(e) {
        text = $(this).children('textarea').val()
        $('.source-text').html(nl2br(text))
        $('.marked-text').html(nl2br(text))
        $('#words-counter').text(text.split(' ').length)
    })

    function createNewMistake() {
        var mistake = {
            errorCode: $("input#errorCode").val(),
            errorComment: $("input#errorComment").val().trim(),
            errorDescription: $("#errorDescription").val().trim(),
            selectedText: $("input#selectedText").val(),
            selectedTextStart: parseInt($("input#selectedTextStart").val()),
            selectedTextFinish: parseInt($("input#selectedTextFinish").val()),
            selectedTextBlock: parseInt($("input#selectedTextBlock").val().trim()),
            replacement: $("#replacement").val(),
            errorTag: $("#errorTag").val(),
        }

        if (mistake.selectedText.length > 0) {
            mistakes.push(mistake)
            //mistakes = mistakes.sort(function(a, b) { return -(a.selectedTextFinish - a.selectedTextStart) + (b.selectedTextFinish - b.selectedTextStart)})
            console.log(mistakes)

            showMistakes()
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
        $("input#selectedTextBlock").val(selectedText.block)

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
//        $.post('/markup/add', markupToSave, function(result) {
 //           console.log(result)
  //          if (result.objectId.length > 0) {
   //             alert("Сохранено! Нажмите кнопку \"Следующий\" для перехода к следующему тексту.")
    //        } else {
     //           alert("Не работает! Пишите администратору!")
      //      }
        //});
    });
});
