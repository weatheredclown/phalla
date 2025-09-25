<%
Function unHtml(content)
    unHtml = content
    If content <> "" Then
        unHtml = Replace(unHtml, " & ", " & ")
        unHtml = Replace(unHtml, "<", "&lt;")
        unHtml = Replace(unHtml, ">", "&gt;")
        unHtml = Replace(unHtml, Chr(34), "'")
        unHtml = Replace(unHtml, Chr(13), "<br>")
        unHtml = Replace(unHtml, Chr(32), "&nbsp;")
        unHtml = ubb(unHtml)
    End If
End Function

function ubb(content)
    Dim nowtime 
    dim i 
    ubb = content
    nowtime = Now()
    ubb = Convert(ubb, "code")
    ubb = Convert(ubb, "html")
    ubb = Convert(ubb, "align")
    ubb = Convert(ubb, "http")
    ubb = Convert(ubb, "url")
    ubb = Convert(ubb, "color")
    ubb = Convert(ubb, "font")
    ubb = Convert(ubb, "size")
    ubb = Convert(ubb, "quote")
    ubb = Convert(ubb, "email")
    ubb = Convert(ubb, "img")
    ubb = Convert(ubb, "swf")

    'UBB=AutoURL(ubb)
    ubb = Replace(ubb, "[b]", "<b>", 1, -1, 1)
    ubb = replace(ubb, "[spoiler]","<small><b>Spoiler:</b></small><br /><div style=""border: 1px dashed gray; padding: 1px;""><div><button type=""button"" class=""button"" onmouseover=""this.sv=this.style.backgroundColor; this.style.backgroundColor='#777777';"" onmouseout=""if(this.sv)this.style.backgroundColor=this.sv; else this.style.backgroundColor='';"" onclick=""this.parentNode.parentNode.childNodes[1].style.display = ''; this.parentNode.style.display = 'none'; return false;"" title=""Click to show the spoiler."">show spoiler</button></div><div class=""spoiler"" style=""display: none;""><div><button type=""button"" class=""button"" onclick=""this.parentNode.parentNode.parentNode.childNodes[0].style.display = ''; this.parentNode.parentNode.style.display = 'none'; return false;"" title=""Click to hide the spoiler."">hide spoiler</button></div><div style=""margin:20px; margin-top:5px; "">", 1, -1, 1)
	ubb = replace(ubb, "[/spoiler]","</div></div></div>", 1, -1, 1)
    ubb = Replace(ubb, "[/b]", "</b>", 1, -1, 1)
    ubb = Replace(ubb, "[i]", "<i>", 1, -1, 1)
    ubb = Replace(ubb, "[/i]", "</i>", 1, -1, 1)
    ubb = Replace(ubb, "[u]", "<u>", 1, -1, 1)
    ubb = Replace(ubb, "[/u]", "</u>", 1, -1, 1)
    ubb = Replace(ubb, "[blue]", "<font color='#000099'>", 1, -1, 1)
    ubb = Replace(ubb, "[/blue]", "</font>", 1, -1, 1)
    ubb = Replace(ubb, "[red]", "<font color='#990000'>", 1, -1, 1)
    ubb = Replace(ubb, "[/red]", "</font>", 1, -1, 1)
    ubb = Replace(ubb, "[green]", "<font color='#009900'>", 1, -1, 1)
    ubb = Replace(ubb, "[/green]", "</font>", 1, -1, 1)

    ubb = Replace(ubb, "[center]", "<center>", 1, -1, 1)
    ubb = Replace(ubb, "[/center]", "</center>", 1, -1, 1)

    For i = 1 To 28
        Dim searchit 
        Dim searchit2 
        searchit = "{:em" & i & "}"
        searchit2 = "<IMG SRC=emot/emotface/em" & i & ".gif></img>"
        ubb = Replace(ubb, searchit, searchit2, 1, 6, 1)
        ubb = Replace(ubb, searchit, "", 1, -1, 1)
    Next
    ubb = Replace(ubb, "[" & Chr(176), "[", 1, -1, 1)
    ubb = Replace(ubb, Chr(176) & "]", "]", 1, -1, 1)
    ubb = Replace(ubb, "/" & Chr(176), "/", 1, -1, 1)
    ' ubb=replace(ubb,"{;em","{:em",1,-1,1)
end function


function Convert(ubb ,CovT ) 
    Dim cText, startubb, endubb, Lcovt, text, codetext, startubb1, endubb1, text1 
    cText = ubb
    startubb = 1
    startubb1 = 1
    Do While CovT = "url" Or CovT = "color" Or CovT = "font" Or CovT = "size" Or CovT = "http" Or CovT = "align"

        Dim instrcovt 
            
        instrcovt = "[" & CovT & "="
        startubb = InStr(startubb, cText, instrcovt, 1)
        startubb1 = InStr(startubb1, cText, instrcovt, 1)

        If startubb = 0 Then Exit Do

        endubb = InStr(startubb, cText, "]", 1)
        
        Dim closecovt 
        closecovt = "[/" & CovT & "]"
        endubb1 = InStr(startubb1, cText, closecovt, 1)

        If endubb = 0 Then Exit Do
        Lcovt = CovT

        startubb = startubb + Len(Lcovt) + 2

        startubb1 = startubb1 + Len(Lcovt) + 6

        text = Mid(cText, startubb, endubb - startubb)
        text1 = Mid(cText, startubb1, endubb1 - startubb1)

        codetext = Replace(text, "[", "[" & Chr(176), 1, -1, 1)
        codetext = Replace(codetext, "]", Chr(176) & "]", 1, -1, 1)
        'codetext=replace(codetext,"{:em","{;em",1,-1,1)
        codetext = Replace(codetext, "/", "/" & Chr(176), 1, -1, 1)

        Select Case CovT
            Case "color"
                cText = Replace(cText, "[color=" & text & "]", "<font color='" & text & "'>", 1, 1, 1)
                cText = Replace(cText, "[/color]", "</font>", 1, 1, 1)
            Case "http"
                cText =replace(cText,"[http=" & text & "]","<img src=../images/htm.gif board=0></img><a href='http://" & codetext & "' target=_blank>",1,1,1)
                cText = Replace(cText, "[/http]", "</a>", 1, 1, 1)
            Case "font"
                cText=replace(cText,"[font=" & text & "]","<font face='" & text & "'>",1,1,1)
                cText = Replace(cText, "[/font]", "</font>", 1, 1, 1)
            Case "align"
                cText=replace(cText,"[align=" & text & "]","<div align ='" & text & "'>",1,1,1)
                cText = Replace(cText, "[/align]", "</div>", 1, 1, 1)
            Case "size"
                If IsNumeric(text) Then
                    If text > 6 Then text = 6
                    If text < 1 Then text = 1
    cText=replace(cText,"[size=" & text & "]","<font size='" & text & "'>",1,1,1)
                    cText = Replace(cText, "[/size]", "</font>", 1, 1, 1)
                End If
            Case "url"

'                Select Case text
'                    Case "htm"
'                        cText = replace(cText,"[url=" & text & "]","<a href='" & text & "'>",1,1,1)
'                        cText = Replace(cText, "[/url]", "</a>", 1, 1, 1)
'                    Case "zip"
'                        cText=replace(cText,"[url=" & text & "]","<img src=../images/zip.gif board=0></img><a href='" & text1 & "' target=_blank>",1,1,1)
'                        cText = Replace(cText, "[/url]", "</a>", 1, 1, 1)
'                    Case "doc"
'                        cText=replace(cText,"[url=" & text & "]","<img src=../images/doc.gif board=0></img><a href='" & text1 & "' target=_blank>",1,1,1)
'                        cText = Replace(cText, "[/url]", "</a>", 1, 1, 1)
'                    Case "rar"
'                        cText = replace(cText,"[url=" & text & "]","<img src=../images/rar.gif board=0></img><a href='" & text1 & "' target=_blank>",1,1,1)
'                        cText = Replace(cText, "[/url]", "</a>", 1, 1, 1)
'                    Case Else
                        cText = replace(cText,"[url=" & text & "]","<a href='" & text & "'>",1,1,1)
                        cText = Replace(cText, "[/url]", "</a>", 1, 1, 1)
'                End Select

            Case "email"
    cText=replace(cText,"[" & CovT & "=" & text & "]","<a href=mailto:" & text & ">",1,1,1)
    cText=replace(cText,"[/" & CovT & "]","</a>",1,1,1)
        End Select
    Loop

    startubb = 1
    Do
        startubb=instr(startubb,cText,"[" & CovT & "]",1)
        If startubb = 0 Then Exit Do
        endubb=instr(startubb,cText,"[/" & CovT & "]",1)
        If endubb = 0 Then Exit Do
        Lcovt = CovT
        startubb = startubb + Len(Lcovt) + 2
        text = Mid(cText, startubb, endubb - startubb)
        codetext = Replace(text, "[", "[" & Chr(176), 1, -1, 1)
        codetext = Replace(codetext, "]", Chr(176) & "]", 1, -1, 1)
        'codetext=replace(codetext,"{:em","{;em",1,-1,1)
        codetext = Replace(codetext, "/", "/" & Chr(176), 1, -1, 1)
        Select Case CovT
            Case "url"
                cText=replace(cText,"[" & CovT & "]" & text,"<a href='" & codetext & "' target=_blank>" & codetext,1,1,1)
                cText=replace(cText,"<a href='" & codetext & "' target=_blank>" & codetext & "[/" & CovT & "]","<a href=" & codetext & " target=_blank>" & codetext & "</a>",1,1,1)

            Case "http"
                cText=replace(cText,"[" & CovT & "]" & text,"<a href='" & codetext & "' target=_blank>" & codetext,1,1,1)
                cText=replace(cText,"<a href='" & codetext & "' target=_blank>" & codetext & "[/" & CovT & "]","<a href=" & codetext & " target=_blank>" & codetext & "</a>",1,1,1)

            Case "align"
                cText=replace(cText,"[" & CovT & "]" & text,"<align ='" & codetext & "' target=_blank>" & codetext,1,1,1)
                cText=replace(cText,"<" & "a href='" & codetext & "' target=_blank>" & codetext & "[/" & CovT & "]","<a href=" & codetext & " target=_blank>" & codetext & "</a>",1,1,1)


            Case "email"
                cText=replace(cText,"[" & CovT & "]","<" & "a href=mailto:" & text & ">",1,1,1)
                cText=replace(cText,"[/" & CovT & "]","<" & "/a>",1,1,1)
            Case "html"
            ' do nothing?                
'                codetext = Replace(codetext, "<br>", Chr(13), 1, -1, 1)
'                codetext = Replace(codetext, "?", Chr(32), 1, -1, 1)
'                Randomize()
'                rid = "temp" & Int(100000 * Rnd())
'    cText=replace(cText,"[html]" & text,"<" & TEXTAREA id=" & rid & " rows=15 style='width:95%' class='bk'>" & codetext,1,1,1)
'    cText=replace(cText,"代码片断如下：<TEXTAREA id=" & rid & " rows=15 style='width:95%' class='bk'>" & codetext & "[/html]","代码片断如下：
' <SCRIPT LANGUAGE=""JavaScript""> function runEx(){var winEx = window.open("""", ""winEx"", ""width=600,height=400,status=yes,menubar=yes,scrollbars=yes,resizable=yes""); winEx.document.open(""text/html"", ""replace"");winEx.document.write(unescape(event.srcElement.parentElement.children[2].value));winEx.document.close();}function openScript(url, width, height) {        var Win = window.open(url,""openScript"",'width=' + width + ',height=' + height + ',resizable=1,scrollbars=yes,menubar=yes,status=yes' );}
' < /SCRIPT><div align=right><TEXTAREA id=" & rid & " rows=15 style='width:95%' class='bk'>" & codetext & "</TEXTAREA><INPUT onclick=runEx('" & rid & "') type=button value=运行此段代码 name=Button1 class='Tips_bo'> <INPUT onclick=JM_cc('" & rid & "') type=button value=复制到我的剪贴板 name=Button2 class='Tips_bo'></div>",1,1,1)
            Case "img"
                response.write("img replace:" & ctext & "<hr>" & text & "<hr>" & codetext)
                cText = replace(cText,"[img]" & text,"<img src=" & text,1,1,1)
                cText = Replace(cText, "[/img]", " vspace=2 hspace=2 border=0 alt=image></a>", 1, 1, 1)
                response.write(ctext)
            Case "code"
                cText = Replace(cText, "[code]" & text, "以下内容为程序代码<hr noshade>" & codetext, 1, 1, 1)
                cText=replace(cText,"以下内容为程序代码<hr noshade>" & codetext & "[/code]","以下内容为程序代码<div align=right><table border=0 cellpadding=0 cellspacing=1 width=95% bgcolor=#c0c0c0><tr><td width=100% bgcolor=#ffffff>" & codetext & "</td></tr></table></div>",1,1,1)
            Case "quote"
                atext = Replace(text, "[img]", "", 1, -1, 1)
                atext = Replace(atext, "[/img]", "", 1, -1, 1)
                atext = Replace(atext, "[swf]", "", 1, -1, 1)
                atext = Replace(atext, "[/swf]", "", 1, -1, 1)
                atext = Replace(atext, "[html]", "", 1, -1, 1)
                atext = Replace(atext, "[/html]", "", 1, -1, 1)
                ' atext=replace(atext,"{:em","{;em",1,-1,1)
                ' atext = SplitWords(atext, 350) // splitwords??
                ' atext = Replace(atext, Chr(32), "?", 1, -1, 1)
                cText = Replace(cText, "[quote]" & text, "<blockquote><hr noshade>" & atext, 1, 1, 1)
    cText=replace(cText,"<blockquote><hr noshade>" & atext & "[/quote]","<blockquote><hr noshade>" & atext & "<hr noshade></blockquote>",1,1,1)
            Case "swf"
    cText=replace(cText,"[swf]" & text,"<object classid='clsid:D27CDB6E-AE6D-11cf-96B8-444553540000' codebase='http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=5,0,0,0' width='500' height='500'><param name=movie value='" & codetext & "'><param name=quality value=high><embed src='" & codetext & "' quality=high pluginspage='http://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash' type='application/x-shockwave-flash' width='500' height='500'></embed></object>",1,1,1)
    cText=replace(cText,"<object classid='clsid:D27CDB6E-AE6D-11cf-96B8-444553540000' codebase='http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=5,0,0,0' width='500' height='500'><param name=movie value='" & codetext & "'><param name=quality value=high><embed src='" & codetext & "' quality=high pluginspage='http://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash' type='application/x-shockwave-flash' width='500' height='500'></embed></object>" & "[/swf]","<object classid='clsid:D27CDB6E-AE6D-11cf-96B8-444553540000' codebase='http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=5,0,0,0' width='500' height='500'><param name=movie value='" & codetext & "'><param name=quality value=high><embed src='" & codetext & "' quality=high pluginspage='http://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash' type='application/x-shockwave-flash' width='500' height='500'>" & "</embed></object>",1,1,1)
        End Select
    Loop
    Convert = cText
end function
%>