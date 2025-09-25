<%
function striphtml(value)
cur = 0
value = value & ""
targ = ""
int count = 0
'response.Write("IT: " & value & " ** " & targ & "<br>")
while value <> "" and count < 20
    l = instr(value,"<")
    if l = 0 then
      m = len(value)
    else      
      subby = mid(value,l+1)
      m = instr(subby,">")
    end if
    if l=0 then
        'response.Write(l & " " & m & " - " & value & "<br>")
        targ = targ & value
        value = ""
    else
       'response.Write(l & " " & m & " - " & value & "<br>")
       targ = targ & left(value,l-1)
       value = mid(value, l+m+1)
       count = count + 1
    end if   
wend
striphtml = targ
end function

    If Session("userid") = "" Then
        '        Response.Redirect("login.asp")
        Session("userid")=-1
	if request.cookies("username") <> "" then
            session("userid") = CInt(request.cookies("userid"))
            session("username") = request.cookies("username")
	end if
    End If
    
    gameid = Request.QueryString("game")
    If gameid = "" Then gameid = 1

    'Create an ADO connection object
    set adoCon = Server.CreateObject("ADODB.Connection")
    
    'Set an active connection to the Connection object using a DSN-less connection
    adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))
    
    'Create an ADO recordset object
    set RS = Server.CreateObject("ADODB.Recordset")
  
    'Initialise the strSQL variable with an SQL statement to query the database
'doesn't work -- SELECT DISTINCTROW games.gameid, Count(posts.postid) AS postcount, games.active, games.gamename, games.description, games.day, games.open FROM games LEFT JOIN posts ON games.gameid = posts.gameid GROUP BY games.gameid, games.active, games.gamename, games.description, games.day, games.open;
'    strSQL = "SELECT games.*, users.username, users.userid FROM games LEFT JOIN users on users.userid = games.owner ORDER BY active, [open], gamename;"
     strSQL = "SELECT games.*, users.username, users.userid, a.playerid FROM (games LEFT JOIN users on users.userid = games.owner) left join (select * from players WHERE userid=" & Session("userid") & ") as a on games.gameid=a.gameid ORDER BY games.active, [open], gamename;"
    'response.Write(strSQL)
    'Open the recordset with the SQL query 
    RS.Open strSQL, adoCon
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" >
<head id="Head1" runat="server">
    <meta name="verify-v1" content="McG9O9Q7uLKs8YqzsVNMHrgt+iNTuj7bZoj17juRxV0=" />    <title>Play Mafia!</title>
    <link rel="stylesheet" type="text/css" href="phalla.css" id="vbulletin_css" />
</head>
<body>
<!--#include virtual="mafia/logo.asp" --> 

<div align="center">
	<div class="page" style="width:98%; text-align:left">
		<div style="padding:0px 10px 0px 10px">
<a href="sitesummary.asp">site summary</a>
<br />
<table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
<thead>
	<tr align="center">
	  <td class="thead">&nbsp;</td>
	  <td class="thead" width="100%" align="left">Game</td>
	  <td class="thead" width="175">Last Post</td>
	  <td class="thead">Posts</td>
	  <td class="thead">Players</td>
	  <td class="thead">Day</td>
	  <td class="thead">Open</td>	  
	</tr>
</thead>
<% 
    'Loop through the recordset
    prevactive  = ""
    statusId = 0 ' 0=nothing; 1=open; 2=running; 3=gameover
    Do While Not RS.EOF    
        if rs("active").value and rs("day").Value=0 then
            status = "Open"
            newStatusId = 1
        elseif rs("active").Value then
            status = "Running"
            newStatusId = 2
        else
            status = "Game Over"
            newStatusId = 3
        end if
        If statusId <> newStatusId Then
            statusId = newStatusId
            %>
<tbody>
	<tr>
		<td class="tcat" colspan="7">
			<a style="float:right" href="#top"><img id="collapseimg_forumbit_5" src="images/collapse_tcat.gif" alt="" border="0" /></a>
			<%=status %>
		</td>
	</tr>
</tbody>
            <%
        End If
%>
 
<%
    set RS2 = Server.CreateObject("ADODB.Recordset")
  
    'Initialise the strSQL variable with an SQL statement to query the database
    strSQL = "SELECT count(playerid) as playercount FROM players WHERE gameid=" & rs("gameid").value & ";"

    'Open the recordset with the SQL query 
    RS2.Open strSQL, adoCon
    playercount = rs2("playercount").value
    rs2.close()
    curgameid = rs("gameid").value
%>   
<tbody> 
<tr align="center">
	<td class="alt2"><img src="<%
	if session("userid") = rs("owner").value then
		response.write("images/phalla.gif"" alt=""your game")	
	elseif rs("active").value then
		if isnull(rs("playerid").value) then response.write("images/active_game.gif") else response.write("images/activeplayed_game.gif")
	else
		if isnull(rs("playerid").value) then response.write("images/inactive_game.gif") else response.write("images/inactiveplayed_game.gif")
	end if
%>" alt="" border="0" id="forum_statusicon_23" /></td>
	<td class="<%
	if rs("day").value = 0 then response.write("alt3") else response.write("alt1Active")
	 %>" align="left" id="f23">
		<div>
			<a href="gamedisplay.asp?g=<%= curgameid %>" style="font-size:13px;"><strong><% if rs("gamename").value="" then response.Write("(no name)") %><%=   rs("gamename").Value%></strong></a>
			<span class="smallfont" style="font-size:10px">[run by <a href="member.asp?u=<%=rs("userid").value%>"><%= rs("username").value %></a>]</span>
		</div>
		<div class="smallfont" style="margin-left:2em;font-size:10px"><%=RS("description").Value%></div>
 		
	</td>
	<td class="alt2" nowrap="nowrap">
<div class="smallfont" align="left">
<%
    strSQL = "SELECT posts.posttext, posts.posttitle, posts.posttime, users.username, users.userid FROM posts INNER JOIN users ON posts.userid = users.userid WHERE (((posts.postid)=(select max(postid) from posts where filter=0 and gameid=" & curgameid & ")));"
    RS2.Open strSQL, adoCon
    if not rs2.eof then
 %>		
		<a title="not clickable"><strong><%		 
		 curposttitle = rs2("posttitle").value
		 if curposttitle = "" then curposttitle = rs2("posttext").value
         curposttitle = striphtml(curposttitle)
		 if len(curposttitle) > 15 then curposttitle = left(curposttitle,15) & "..."
		 response.Write(curposttitle)
		 %></strong></a></div><div style="width:260px;" class="smallfont"><div style="float:left;width:120px;text-align:left;">
		by <a href="member.asp?u=<%= rs2("userid").value %>" rel="nofollow"><%= rs2("username").value %></a></div><div style="text-align:right;" class="smallfont">
		<span class="time"><%= rs2("posttime").value %></span>
		<!-- <a href="showthread.php?p=6172949#post6172949"><img class="inlineimg" src="images/goto.gif" alt="Go to last post" border="0" /></a> --> </div></div> 
<% 
   end if
   rs2.close()
 %>		
</td>
	<td class="alt1">
	<%
	
    strSQL = "SELECT count(*) as postcount FROM posts WHERE gameid=" & curgameid & " and filter=0;"
    RS2.Open strSQL, adoCon
    if not rs2.eof then
        response.Write(rs2("postcount").value)
    else
        response.Write("0")
    end if
	
	  %>
	</td>
	<td class="alt2"><%=playercount%></td>
	<td class="alt1"><%=RS("day").Value%></td>
	<td class="alt2"><% if RS("open").Value then response.Write("Yes") else response.Write("No") %></td>
</tr>
</tbody>
<%
    'Move to the next record in the recordset 
    rs.MoveNext()
Loop
%>
</table>
</div></div></div>

<br><br><br><font color=gray>mafia-style asp site <i>work in progress</i> - email: <b>tim</b> at an <b>org</b> known as <b>happyworldland</b></font>
<!--#include virtual="mafia/googletrack.inc" --> 

</body>
</html>
<%  
    rs.Close()
    set adoCon = Nothing%>
