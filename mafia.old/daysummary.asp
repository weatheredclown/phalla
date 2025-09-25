<% 
    gameid = Request.QueryString("g")
    If gameid = "" Then gameid = 1


    set adoCon = Server.CreateObject("ADODB.Connection")
    adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))
    set RS = Server.CreateObject("ADODB.Recordset")


    mysql = "SELECT gamename, description, owner FROM games WHERE gameid = " & gameid & ";"
    RS.Open mysql, adocon
    
    if rs.eof then
        response.Write("error")
        response.end
    end if
    
    if rs("owner").value <> session("userid") then
        response.Write("access denied")
        response.end
    end if

    gamename = rs("gamename").value    
    description = rs("description").value

    rs.close()

    if request.form("changename")<>"" then
	gamename = request.form("gamename")
	mysql = "UPDATE games SET gamename = '" & replace(gamename,"'","''") & "' WHERE gameid = " & gameid
        adoCon.execute mysql
    end if

    if request.Form("deletegame")<>"" and request.Form("confirm")="yes" then
         mysql = "DELETE FROM players WHERE gameid = " & gameid & ";"
         adoCon.execute mysql
         mysql = "DELETE FROM games WHERE gameid = " & gameid & ";"
         adoCon.execute mysql
    end if
    

    if request.Form("resetgame")<>"" and request.Form("confirm")="yes" then
         mysql = "UPDATE games SET [day] = 0, [active] = yes, [open] = yes WHERE gameid = " & gameid & ";"
         adoCon.execute mysql
         mysql = "DELETE FROM actions WHERE gameid = " & gameid & ";"
         adoCon.execute mysql
         strSQL = "INSERT INTO posts (posttitle, userid, posttime, gameid) VALUES ('Day 0 (game reset!)', " & session("userid") & ", NOW, " & gameid & ");"
         adoCon.execute strSQL, 0, 0
         strSQL = "UPDATE players SET postsleft = -1, active = yes WHERE gameid = " & gameid & ";"
         adoCon.execute strSQL         
    end if
    
    if request.Form("gameover")<>"" and request.Form("confirm")="yes" then
         mysql = "UPDATE games SET [active] = no, [open] = no WHERE gameid = " & gameid & ";"
         adoCon.execute mysql
         strSQL = "INSERT INTO posts (posttitle, userid, posttime, gameid) VALUES ('GAME ENDED!', " & session("userid") & ", NOW, " & gameid & ");"
         adoCon.execute strSQL, 0, 0
    end if

    if request.Form("resetforum")<>""  and request.Form("confirm")="yes" then
         mysql = "DELETE FROM posts WHERE gameid = " & gameid & ";"
         adoCon.execute mysql
    end if
  
    
    mysql = "SELECT game_actions.username, game_actions.actionname, game_actions.targetname, game_actions.day FROM game_actions WHERE game_actions.actiontypeid<>17 AND game_actions.gameid= " & gameid & " ORDER BY game_actions.day, game_actions.actionname, game_actions.targetname, game_actions.username;"
    rs.open mysql, adoCon
    
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" >
<head id="Head1">
    <title>GM Day Summary</title>
    <link rel="stylesheet" type="text/css" href="phalla.css" id="vbulletin_css" />
</head>
<body>

<!-- breadcrumb, login, pm info -->

	<table class="page" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
	<tr>
		<td class="page" valign="bottom" width="100%">
			<span class="navbar"><a href="games.asp" accesskey="1">List of Games</a></span> 
	<span class="navbar">&gt; <a href="gamedisplay.asp?g=<%=gameid %>"><%=gamename%></a></span>
 &raquo; <strong><i>summary</i></strong>
		</td>	
	</tr>
	</table>

<!-- / breadcrumb, login, pm info -->

<table border=1>
<% 
curday = -1
do while not rs.eof 

    if curday <> rs("day").value then
        curday = rs("day").value
        %>
        <tr><td colspan=3>Day <%=curday %></td></tr>
        <%
    end if
%>
 <tr><td><%=rs("username").value %></td><td><%= rs("actionname").value %></td><td><%=rs("targetname").value %></td></tr>

<%  rs.movenext()
    loop %>
</table>
<hr />
<form method=post action="daysummary.asp?g=<%=gameid %>">
<input type="submit" name="resetgame" value="reset game" />
<input type=checkbox value=yes name=confirm /> (confirm)
</form>
<hr />
<form method=post action="daysummary.asp?g=<%=gameid %>">
<input type="submit" name="gameover" value="game over" />
<input type=checkbox value=yes name=confirm /> (confirm)
</form>
<hr />
<form method=post action="daysummary.asp?g=<%=gameid %>">
<input type="submit" name="resetforum" value="clear forum" />
<input type=checkbox value=yes name=confirm /> (confirm)
</form>
<hr />
<form method=post action="daysummary.asp?g=<%=gameid %>">
<input type="submit" name="deletegame" value="delete game" />
<input type=checkbox value=yes name=confirm /> (confirm)
</form>
<hr />
<form method=post action="daysummary.asp?g=<%=gameid %>">
<input name=gamename value='<%=replace(gamename,"'","&#39;")%>'/><br />
<%= description%><br/>
<input type="submit" name="changename" value="change name" />
</form>
<!--#include virtual="mafia/googletrack.inc" --> 
</body>
</html>
<% rs.close() %>