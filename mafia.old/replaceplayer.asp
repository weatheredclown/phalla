<%

    If Session("userid") = "" Then
        '        Response.Redirect("login.asp")
        Session("userid")=-1
    End If

    userid = Session("userid")

    gameid = Request.QueryString("g")
    If gameid = "" Then gameid = 1
    
    playeridtoreplace = Request.QueryString("p")    
    if playeridtoreplace = "" then 
        reponse.redirect("gamedisplay.asp?g=" & gameid)
    end if
    
    'Create an ADO connection object
    Dim adoCon 
    set adoCon = Server.CreateObject("ADODB.Connection")
    adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))

    if request.QueryString("replace") = "y" then
        newuserid = request.QueryString("newid")
        mysql = "UPDATE players SET userid = " & newuserid & " WHERE playerid = " & playeridtoreplace
        adoCon.Execute mysql
        response.Redirect("gamedisplay.asp?g=" & gameid )        
    end if


    set RS = Server.CreateObject("ADODB.Recordset")

    rs.Open "SELECT owner FROM games WHERE gameid = gameid", adocon
    if rs.EOF then
        response.Redirect("games.asp")
    end if
    if rs("owner").value <> userid then
        response.Redirect("games.asp")
    end if
    rs.Close

    sql = "SELECT players.playerid, users.username, users.userid, players.gameid FROM players right join users on users.userid=players.userid ORDER BY username"
    rs.Open sql, adocon
    ' response.Write(sql + "<br>")
    lastid = -1
    keptname = ""
    ingame = false
    playername = ""
    lastplayerid = -1
    selecttext = "<select name=newid>"
    while not rs.EOF
        lastplayerid = rs("playerid").value
        keptname = rs("username").value
        id = rs("userid")

        agameid = rs("gameid").value
        if agameid = cint(gameid) then 
            if lastplayerid = cint(playeridtoreplace) then playername = keptname
            ingame = true
        end if
        rs.movenext
        
        lastid = id
        if rs.eof then 
            id = -1
        else
            id = rs("userid").value
        end if
        if lastid <> id then
            'response.Write(lastid & "+" & id & "-")
                'response.Write(lastplayerid & " " & cint(playeridtoreplace) & " " & playername & " " &  keptname)

            if ingame then                
                response.Write("in game " & keptname & "<br>")
            else
                selecttext = selecttext & "<option value=" & lastid & ">" & keptname & "</option>"
            end if
            ingame = false
        end if        
    wend
    selecttext = selecttext & "</select>"
%>
<big><big><big>REPLACE PLAYER <i>BETA</i></big></big></big>
<form>
replace: <%= playername %><br />
<%=selecttext %>
<input name=replace value=y type=hidden />
<input name=g value=<%=gameid %> type=hidden />
<input name=p value=<%=playeridtoreplace %> type=hidden />
<br />
<input type=submit />
</form>
