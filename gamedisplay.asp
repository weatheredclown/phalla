<!--#include virtual="getuserid.inc" --> 
<!--#include virtual="Char.inc" --> 
<%
    If Session("userid") = "" Then
        '        Response.Redirect("login.asp")
        Session("userid")=-1
    End If

    userid = Session("userid")

    gameid = Request.QueryString("g")
    If gameid = "" Then gameid = 1
    
    'Create an ADO connection object
    Dim adoCon 
    set adoCon = Server.CreateObject("ADODB.Connection")
    
    'Set an active connection to the Connection object using a DSN-less connection
    adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))
    set RS2 = Server.CreateObject("ADODB.Recordset")

    actionid = -1

    if request.form("assignrole")="y" then
        assign_player = request.form("assignplayer")
        if request.form("role") <> "" then
            assign_role = request.form("role")
            assign_description = replace(request.form("description"),"'","''")
            strSQL = "UPDATE players SET roleid=" & assign_role & ", description='" & assign_description &"' WHERE playerid=" & assign_player & " and gameid = " & gameid & ";"
        else
            assign_alive = request.form("alive")
            if assign_alive="yes" then postsleft = -1 else postsleft = 1
            strSQL = "UPDATE players SET active=" & assign_alive & ", postsleft=" & postsleft & " WHERE playerid=" & assign_player & " and gameid = " & gameid & ";"
        end if
        'response.write(strsql)
        adoCon.execute strSQL,0,0
    end if
    
    unvote = false

    if request.Form("qr_unvote") = "1" then
        gameday = request.form("gameday")
        playerid = request.form("playerid")
        strSQL = "UPDATE actions SET valid=no WHERE day=" & gameday & " AND playerid = " & playerid & " and gameid = " & gameid & " and actiontypeid=1;"
        adoCon.execute strSQL,0,0
        unvote = true
    end if
    
    additionalactions = ""
    
    if request.form("qr_vote") = "1" then
        postactionname = "vote"
        votetarget = request.form("target_vote")
        gameday = request.form("gameday")
        playerid = request.form("playerid")
        strSQL = "UPDATE actions SET valid=no WHERE day=" & gameday & " AND playerid = " & playerid & " and gameid = " & gameid & " and actiontypeid=1;"
        adoCon.execute strSQL,0,0
        strSQL = "INSERT INTO actions (playerid, [day], actiontypeid, targetplayerid, gameid, [date], valid) VALUES (" & playerid & ", " & gameday & ", 1, " & votetarget & ", " & gameid & ", NOW, yes);"
        'response.write(strSQL & "<br>")
        adoCon.execute strSQL,0,0
        strSQL = "SELECT actionid FROM actions WHERE valid=yes and day=" & gameday & " AND playerid = " & playerid & " and gameid = " & gameid & " and actiontypeid=1;"
        'response.write(strSQL & "<br>")
        rs2.open strSQL, adoCon
        if rs2.eof then
            response.write("ERROR!")
        else
            actionid = rs2("actionid").value
        end if 
        rs2.close()
    end if

    if request.Form("qr_notebook") = "1" then
        ' 17 = notebook
        nbtarget = request.Form("target_notebook")
        nbcomment = request.Form("notebook_comment")
        nbcomment = replace(nbcomment,"'","''")
        gameday = request.form("gameday")
        playerid = request.form("playerid")
        strSQL = "UPDATE actions SET valid=no WHERE targetplayerid=" & nbtarget & " AND playerid = " & playerid & " and gameid = " & gameid & " and actiontypeid=17;"
        'response.write(strSQL & "<br>")
        adoCon.execute strSQL,0,0
        strSQL = "INSERT INTO actions (playerid, [day], actiontypeid, targetplayerid, gameid, [date], valid, comment) VALUES (" & playerid & ", " & gameday & ", 17, " & nbtarget & ", " & gameid & ", NOW, yes, '" & nbcomment & "');"
        'response.write(strSQL & "<br>")
        adoCon.execute strSQL,0,0
        
    end if

    if request.Form("qr_claim") = "1" then
        claimrole = request.Form("role_claim")
        strSQL = "SELECT rolename FROM roles WHERE roleid = " & claimrole
        claimrolename = "unknown"
        rs2.open strSQL, adoCon
        if not rs2.EOF then
            claimrolename = rs2("rolename")
        end if
        rs2.close
        gameday = request.form("gameday")
        playerid = request.form("playerid")
        strSQL = "UPDATE actions SET valid=no WHERE playerid = " & playerid & " and gameid = " & gameid & " and actiontypeid=14;" ' assumes claim is 14
        adoCon.execute strSQL,0,0
        strSQL = "INSERT INTO actions (playerid, [day], actiontypeid, targetplayerid, gameid, [date], valid, comment) VALUES (" & playerid & ", " & gameday & ", 14, " & playerid & ", " & gameid & ", NOW, yes, '" & claimrolename & "');" ' assumes that claim is 14
        'response.write(strSQL & "<br>")
        adoCon.execute strSQL,0,0
        
        if actionid <> -1 then
            additionalactions = "<br><br><hr><font color=yellow><b>claim " & claimrolename  & "</b></font>"
        else
            postactionname = "claim"
            strSQL = "SELECT actionid FROM actions WHERE valid=yes and day=" & gameday & " AND playerid = " & playerid & " and gameid = " & gameid & " and actiontypeid=14;"
            'response.write(strSQL & "<br>")
            rs2.open strSQL, adoCon
            if rs2.eof then
                response.write("ERROR!")
            else
                actionid = rs2("actionid").value
            end if 
            rs2.close()
        end if            
    end if

    themessage = request.form("message") 
    if themessage = "" and actionid <> -1 then themessage = postactionname
    if themessage = "" and unvote then themessage = "unvote"
    thetitle = request.form("title")
    if not (themessage = "") then
        rawmessage = replace(themessage,"'","''")
        themessage = replace(themessage,"<","&lt;")
        themessage = replace(themessage,">","&gt;")
	    themessage = ubb(themessage)
        themessage = replace(themessage,chr(13),"<br>")
        themessage = replace(themessage,"'","''")
        themessage = themessage & additionalactions

        thetitle = replace(thetitle,"<","&lt;")        
        thetitle = replace(thetitle,">","&gt;")
        thetitle =replace(thetitle,"'","''")

        if request.form("edit")="y" then
		    strSQL = "UPDATE posts SET rawposttext='" & rawmessage & "', posttitle = '" & thetitle & "', posttext = '" & themessage & "' WHERE postid = " & request.form("postid") & ";"
		    adoCon.execute strSQL
        else
	        strSQL = "INSERT INTO posts (posttitle, posttext, rawposttext, userid, posttime, gameid, actionid, filter) VALUES ('" & thetitle & "','" & themessage & "','" & rawmessage &"', " & userid & ", NOW, " & gameid & ", " & actionid & ", 0);"
        	'RESPONSE.WRITe(strSQL)
	        RS2.Open strSQL, adoCon 
        	'RS2.Close()    
            postsleft = request.Form("postsleft")
            if postsleft="1" then
                strsql = "UPDATE players set postsleft = 0 WHERE userid = " & userid & " AND gameid = " & gameid
                'response.Write strsql                
                adoCon.Execute strsql
            end if		    
		    response.redirect("gamedisplay.asp?g=" & gameid)
	    end if
    end if
    
    if request.Form("signup") = "y" and userid<>-1 then
        strSQL = "SELECT playerid FROM players WHERE gameid = " & gameid & " AND userid = " & userid & ";"
        RS2.Open strSQL, adoCon
        if rs2.eof then        
            strSQL = "INSERT INTO players (userid, gameid, roleid, active) VALUES (" & userid & "," & gameid & ", 1, yes);"
            adoCon.execute strSQL, 0,0
        end if
        RS2.close()
    end if

    'Create an ADO recordset object
    set RS = Server.CreateObject("ADODB.Recordset")  
    strSQL = "SELECT [open], gamelocked, owner, gamename, active, day, username from games inner join users on games.owner = users.userid WHERE gameid = " & gameid & ";"
'response.write strsql
    RS.Open strSQL, adoCon
    gameownername = rs("username").value
    gameday = rs("day").value
    gamename = rs("gamename").value
    gamelocked = rs("gamelocked").value
    gameactive = rs("active").value
    gameowner = rs("owner").value
    gameopen = rs("open").value
    RS.Close()


    if request.querystring("delete")<> "" and (userid = 15 or userid=gameowner) then
    	strSQL = "DELETE FROM posts WHERE postid = " & request.querystring("delete")
	adocon.execute strSQL
    end if

    if request.querystring("kick")<>"" and gameday = 0 then
	strSQL = "DELETE FROM actions WHERE gameid = " & gameid & " AND playerid = " & request.querystring("kick")
	adocon.execute strsql
	strSQL = "DELETE FROM players WHERE gameid = " & gameid & " AND playerid = " & request.querystring("kick")
	adocon.execute strsql
    end if

    if request.QueryString("togglelocked")="y" then
        if gamelocked then 
            gamelocked = false
            val = "no"
        else
            gamelocked = true
            val = "yes"
        end if
        strSQL = "UPDATE games SET gamelocked = " & val & " WHERE gameid = " & gameid
        adocon.Execute strSQL
    end if

    if gameowner=userid and request.querystring("nextday") = "1" then
        gameday = gameday + 1
        strSQL = "UPDATE games SET [day] = " & gameday & ", [open] = no WHERE gameid = " & gameid & ";"
        'response.write(strSQL)
        adoCon.execute strSQL, 0, 0
        strSQL = "INSERT INTO posts (posttitle, userid, posttime, gameid) VALUES ('Day " & gameday & "', " & gameowner & ", NOW, " & gameid & ");"
        'response.write(strSQL)
        adoCon.execute strSQL, 0, 0
        gameopen = false
    end if

    roleid = -1
    playerid = -1
    strSQL = "SELECT postsleft, roleid, playerid, active FROM players WHERE userid = " & userid & " and gameid = " & gameid & ";"
    RS2.Open strSQL, adoCon
    if not rs2.eof then 
        playerpostsleft = rs2("postsleft").value
        roleid = rs2("roleid").value
        playerid = rs2("playerid").value
        playeractive = rs2("active").value
    end if 
    RS2.Close()    
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" >
<head id="Head1">
    <title>Game: <%= gamename %></title>
    <script src="/clientscript/my_rounded.js" type="text/javascript"></script>
    <link rel="stylesheet" type="text/css" href="phalla.css" id="vbulletin_css" />
</head>
<body>
<!--#include virtual="logo.asp" --> 
<div align="center">
	<div class="page" style="width:98%; text-align:left">
		<div style="padding:0px 10px 0px 10px">
<br />


<!-- breadcrumb, login, pm info -->

	<table class="page" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
	<tr>
		<td class="page" valign="bottom" width="100%">
			<span class="navbar"><a href="games.asp" accesskey="1">List of Games</a></span> 
 &raquo; <strong>
	<%=gamename %> -- (<i>Moderator: <a href="member.asp?u=<%= gameowner%>"><%= gameownername %></a></i>)

</strong>
		</td>	
	</tr>
	</table>

<!-- / breadcrumb, login, pm info -->

<table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center" style="border-bottom-width:0px">
<tr>
	<td class="tcat" <%if gamelocked then %>style="background-color:red"<%end if %>>Game<span class="normal"> : <%=gamename %></span> [day <%=gameday %>] <% if not gameactive then response.write("-- GAME OVER!!!")%> <%if gamelocked then response.Write("<i>Game Locked</i>") %></td>
	<% if roleid <> -1 then %>
	<td class=tcat align=center width=10%> <a href="mygame.asp?g=<%=gameid %>">my game</a></td>
	<% end if %>
	<% if gameowner = userid then %>
	<td class=tcat align=center width=10%><a href="gamedisplay.asp?g=<%=gameid %>&togglelocked=y"><% if gamelocked then response.Write("[unlock]") else response.Write("[lock]") %></a></td>
	<td class=tcat align=center width=10%><a href="daysummary.asp?g=<%=gameid %>" title="day summary">admin</a><br /><a href="gamedisplay.asp?nextday=1&g=<%=gameid %>">next day</a><br /><a href="mygame.asp?g=<%=gameid %>">view private</a></td>
	<% 
	end if
	%>
</tr>
</table>
<!-- player list -->
<table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center" id="threadslist">
<thead>
	<tr align="center">
	  <td class="thead">&nbsp;</td>
	  <td class="thead" width="100%" align="left">Player</td>
	  <td class="thead" width="175">Alive</td>
	  <td class="thead">Votes</td>
	</tr>
</thead>
<% 
    'Initialise the strSQL variable with an SQL statement to query the database
    strSQL = "SELECT roles.rolename, users.username, users.userid, players.playerid, players.active, players.roleid, players.description FROM (users INNER JOIN players ON users.userid = players.userid) INNER JOIN roles ON players.roleid = roles.roleid where gameid=" & gameid & " ORDER BY active, username;"
    'Open the recordset with the SQL query 
    RS.Open strSQL, adoCon
    'Loop through the recordset
    Do While Not RS.EOF
    
       strSQL = "SELECT game_actions.username FROM game_actions WHERE game_actions.targetuserid = " & rs("userid").value & " and game_actions.actiontypeid=1 AND game_actions.day=" & gameday & " and gameid = " & gameid
       ' strSQL = "SELECT Count(actions.actionid) AS votecount FROM actions WHERE actions.targetplayerid=" & RS("playerid").value & " AND actions.valid=Yes AND actions.actiontypeid=1 and actions.day=" & gameday & ";" ' typeid=1; vote
       RS2.Open strSQL, adoCon
       votecount = 0
       voters = ""
       while not rs2.EOF
            if voters <> "" then voters = voters + ", "
            voters = voters + rs2("username")
            votecount = votecount + 1
            rs2.movenext
       wend
       rs2.close()       
    
       if RS("active").value = true then
        alive="Yes"
       else
        alive="No"
       end if
%>
 <tbody>
<tr align="center">
	<td class="alt2"><%
	    if playerid<>-1 then 		
	%><a href="newplayercomment.asp?g=<%=gameid %>&p=<%=rs("playerid").value %>&d=<%=gameday %>&me=<%=playerid %>"><%
	    end if %><img src="images/<% if alive="Yes" then response.write("phalla") else response.write("dead_phalla") %>.gif" alt="<% if playerid<>-1 then response.write("edit notebook comment")%>" border="0" id="forum_statusicon_23" /><%
	    if playerid<>-1 then response.Write("</a>")
	     %></td>
	<td class="alt1Active" align="left" id="f23" <% if userid=rs("userid").Value then %>style="background-color:#121250" <%end if %> >
		<div>
		<a href="member.asp?u=<%=rs("userid").value %>"><%= rs("username").value %></a><% if userid=gameowner and gameactive then %>
		<form method=post action="gamedisplay.asp?g=<%=gameid %>">
		<input type=hidden name=assignrole value=y />
		<input type=hidden name=assignplayer value=<%= rs("playerid").value %> />
		| role: 
<%
		    strSQL = "SELECT * from roles"
		    rs2.open strSQL, adoCon
		    selecttext = "<select class='bginput' name=role>"
            therolename = ""
		    do while not rs2.eof
		        if rs("roleid").value = rs2("roleid").value then 
		            isselected = "SELECTED" 
		            therolename = rs2("rolename").value
		        else 
		            isselected=""
		        end if
		        selecttext = selecttext & "<option value=" & rs2("roleid").value & " " & isselected & ">" & rs2("rolename").value & "</option>"
		        rs2.movenext()
		    loop 
		    selecttext = selecttext & "</select>"
		    rs2.close()
		    if gameopen then
     %>		
            <%= selecttext %> | description: <input type="text" class="bginput" name=description size=100 value='<% 
             description = rs("description").value
             if not (description = "") then description = replace(description,"'","&#39;") 
             response.write(description)
             %>'/>
            <input type="submit" class="button" value="edit" name="sbutton"/> <a href="gamedisplay.asp?g=<%=gameid%>&kick=<%=rs("playerid").value%>">[kick]</a>
		<% elseif gameactive then %>
		<%= therolename %> <br> <b>description:</b> <%= rs("description").value %> <br>
             | Alive: <select name="alive"><option value="yes" <% if alive="Yes" then %>selected<% end if %>>Yes</option><option value="no" <% if alive="No" then %>selected<% end if %>>No</option></select>
            <input type="submit" class="button" value="edit" name="sbutton"/>
        <% else %>
        		<%= therolename %>
            <% end if %>
		</form>
		| <a href="replaceplayer.asp?g=<%=gameid%>&p=<%=rs("playerid") %>">replace player</a>
		<% end if %>
		<% if userid=rs("userid").Value then 
		%>
		| <i>(you)</i> - role: <% 
                if gameday=0 then %>
		<i>game not started yet</i> | <a href="gamedisplay.asp?g=<%=gameid%>&kick=<%=playerid%>"><b><i>unsignup</i></b></a><% 
		else 
			response.write("<b>" & rs("rolename").Value & "</b>")
    	        end if
              sql = "SELECT username FROM game_actions WHERE actiontypeid=16 AND targetuserid = " & userid & " AND gameid = " & gameid
              rs2.Open sql, adocon
              if not rs2.EOF then
                %>| <a href="mygame.asp?g=<%=gameid %>"><font color=fuchsia>trusted by <%=rs2("username").value %></font></a><%
              end if
              rs2.close
		elseif alive="No" or not gameactive then 
		%> | role: <%=rs("rolename").value%>  <% 
		end if 

		strsql = "SELECT comment FROM actions WHERE actiontypeid=14 AND valid=yes AND playerid = " & rs("playerid").value  & " AND gameid = " & gameid
		rs2.Open strsql, adocon
	    if not rs2.eof then
	        %>
	        | <b><font color=yellow>claim <%=rs2("comment").value %></font></b>
	        <%
	    end if
  		rs2.close
  		
        ' notebook comments
        sql = "SELECT comment FROM actions WHERE playerid=" & playerid & " AND actiontypeid=17 AND targetplayerid = " & rs("playerid").value & " AND gameid = " & gameid & " AND valid=yes"
        'response.write(sql)
        rs2.Open sql, adocon
        if not rs2.EOF then
          %>| <a href="newplayercomment.asp?g=<%=gameid %>&p=<%=rs("playerid").value %>&d=<%=gameday %>&me=<%=playerid %>"><i><font color="#ff9900"><%=rs2("comment").value%></font></i></a> <%
        end if
        rs2.close
  		
		%>
		
		</div>
 	</td>
	<td class="alt2" nowrap="nowrap">
	<%= alive %>
</td>
	<td class="alt1"  title="<%=voters %>"><%= votecount %></td>
</tr>
</tbody>
<%
    'Move to the next record in the recordset 
    rs.MoveNext()
Loop
rs.close()
%>
</table>

<!-- /player list -->

<% if roleid=-1 and gameactive=true and gameopen=true and userid<>-1 then %>
<br />
<form action="gamedisplay.asp?g=<%=gameid %>" method=post>
<input name="signup" value="y" type="hidden" />
<input type="submit" class="button" value="signup" accesskey="s" title="(Alt + S)" name="sbutton" tabindex="3" id="Submit1"/>
</form>
<% end if %>
<br /><br />
<% posts_title = "Public Discussion" 
   posts_filter = 0
   canpost = (userid = gameowner) or (roleid <> -1 and ((not gameactive) or playeractive or playerpostsleft=1))
%>
<!-- #include virtual="posts.inc" -->

<br /><br />

<% if canpost then 

  if gamelocked and userid <> gameowner then
  %>
  <i>This game is currently locked.</i>
  <%
  else

  qr_title = "Post in Game" 
  if playerpostsleft = 1 then qr_title = qr_title & ": <font color=cyan>You are now dead.  This is your last Post!</font>"
   qr_filter = 0
   if request.QueryString("q") <> "" then
    ' quote
    mysql = "SELECT posttitle, rawposttext FROM posts WHERE postid = " & request.QueryString("q")
    rs.Open mysql, adocon
    if not rs.EOF then
        if rs("posttitle").value <> "" then
            seededtitle = "RE: " & replace(rs("posttitle").value,"""","""""")
        end if
        seededtext = "[quote]" & rs("rawposttext").value & "[/quote]" & chr(13)
    end if
    rs.close
   end if
%>
<!-- #include virtual="quickreply.inc" -->
<% 
  end if
end if %>
</div>

<br /><br />
</div></div></div>
<!--#include virtual="googletrack.inc" --> 
</body>
</html>
<%  
    set adoCon = Nothing%>
