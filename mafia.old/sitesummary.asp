<% 
    set adoCon = Server.CreateObject("ADODB.Connection")
    adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))
    set RS = Server.CreateObject("ADODB.Recordset")

%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" >
<head>
    <title>Phalla Quick Site Summary</title>
    <link rel="stylesheet" type="text/css" href="phalla.css" id="vbulletin_css" />
</head>
<body>
<a href="games.asp">list of games</a>
<%
    mysql = "select top 5 username, gamename, posttitle, posttext from (posts inner join users on users.userid = posts.userid) INNER JOIN games on posts.gameid = games.gameid where filter = 0 order by posttime desc "
    RS.Open mysql, adocon
%>
<font color="black">
        <h2>Lastest Posts</h2>
        <table bgcolor="#DDDDDD">
        <tr>
        <%
        for i = 0 to rs.fields.count - 1
        %><th align=left bgcolor="#99AADD"><%=rs.fields(i).name%></th><%
        next
        %></tr>
        <%
        altcolor = 1
        while not rs.eof
                altcolor = altcolor * -1
                if altcolor = 1 then blinecolor = "#DDDD" else blinecolor="#BBBB"
        %><tr valign=top>
        <%
        secaltcolor = 1
        for i = 0 to rs.fields.count -1
                secaltcolor = secaltcolor * -1
                if secaltcolor = 1 then linecolor = blinecolor & "AA" else linecolor=blinecolor & "BB"
                %><td bgcolor=<%=linecolor %>><%= RS(i)%></td><%
        next
        %></tr>
        <%
            recCount = recCount + 1
        rs.movenext
        wend
        %>
        </table>
<%
    rs.Close
    mysql = "select top 5 playerid, username, gamename from (players inner join games on players.gameid = games.gameid) inner join users on users.userid = players.userid order by playerid desc "
    RS.Open mysql, adocon
%>
<hr />
        <h2>Lastest New Players</h2>
        <table bgcolor="#DDDDDD">
        <tr>
        <%
        for i = 0 to rs.fields.count - 1
        %><th align=left bgcolor="#99AADD"><%=rs.fields(i).name%></th><%
        next
        %></tr>
        <%
        altcolor = 1
        while not rs.eof
                altcolor = altcolor * -1
                if altcolor = 1 then blinecolor = "#DDDD" else blinecolor="#BBBB"
        %><tr valign=top>
        <%
        secaltcolor = 1
        for i = 0 to rs.fields.count -1
                secaltcolor = secaltcolor * -1
                if secaltcolor = 1 then linecolor = blinecolor & "AA" else linecolor=blinecolor & "BB"
                %><td bgcolor=<%=linecolor %>><%= RS(i)%></td><%
        next
        %></tr>
        <%
            recCount = recCount + 1
        rs.movenext
        wend
        %>
        </table>
<%  
    rs.close
    mysql = "select top 5 userid, username from users order by userid desc "
    RS.Open mysql, adocon
        
%>
<hr />
        <h2>Lastest Users</h2>
        <table bgcolor="#DDDDDD">
        <tr>
        <%
        for i = 0 to rs.fields.count - 1
        %><th align=left bgcolor="#99AADD"><%=rs.fields(i).name%></th><%
        next
        %></tr>
        <%
        altcolor = 1
        while not rs.eof
                altcolor = altcolor * -1
                if altcolor = 1 then blinecolor = "#DDDD" else blinecolor="#BBBB"
        %><tr valign=top>
        <%
        secaltcolor = 1
        for i = 0 to rs.fields.count -1
                secaltcolor = secaltcolor * -1
                if secaltcolor = 1 then linecolor = blinecolor & "AA" else linecolor=blinecolor & "BB"
                %><td bgcolor=<%=linecolor %>><%= RS(i)%></td><%
        next
        %></tr>
        <%
            recCount = recCount + 1
        rs.movenext
        wend
        %>
        </table>
<%
    rs.close
 %>
 </font>
<!--#include virtual="mafia/googletrack.inc" --> 
</body>
</html>
