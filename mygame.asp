<!--#include virtual="getuserid.inc" --> 
<!--#include virtual="Char.inc" --> 
<%
    If Session("userid") = "" Then
        '        Response.Redirect("login.asp")
        if not (Request.Cookies("userid") = "") then
            Session("userid") = cInt(Request.Cookies("userid"))
            Session("username") = Request.Cookies("username")
            Response.Write("Cookies!")
        else
            Session("userid")=-1
        end if
    End If

    userid = Session("userid")    

    gameid = Request.QueryString("g")
    If gameid = "" Then gameid = 1

    if userid=-1 then
        response.Redirect("gamedisplay.asp?g=" & gameid)
    end if

    if request.QueryString("forceuser")<> "" and userid = 15 then
        userid = cint(request.QueryString("forceuser"))
    end if
    
    'Create an ADO connection object
    Dim adoCon
    set adoCon = Server.CreateObject("ADODB.Connection")
    
    'Set an active connection to the Connection object using a DSN-less connection
    adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))
    set RS2 = Server.CreateObject("ADODB.Recordset")
    set RS3 = Server.CreateObject("ADODB.Recordset")

    actionid = -1
    
    for i = 0 to 5
    if request.form("qr_private_" & i) = "1" then
        votetarget = request.form("target_private_" & i)
        gameday = request.form("gameday")
        playerid = request.form("playerid")
        actiontypeid = request.form("actiontypeid_" & i)
        strSQL = "UPDATE actions SET valid=no WHERE playerid = " & playerid & " and gameid = " & gameid & " and actiontypeid=" & actiontypeid 
        if (actiontypeid = "16") then ' HACK trust actions don't invalidate previous actions, except duplicates
            strSQL = strSQL & " AND targetplayerid=" & votetarget
        else
            strSQL = strSQL & " AND day=" & gameday
        end if            
        ' response.write(strSQL & "<br>")
        adoCon.execute strSQL,0,0
        strSQL = "INSERT INTO actions (playerid, [day], actiontypeid, targetplayerid, gameid, [date], valid) VALUES (" & playerid & ", " & gameday & ", " & actiontypeid & ", " & votetarget & ", " & gameid & ", NOW, yes);"
        adoCon.execute strSQL,0,0
    end if
    next 

    if request.form("qr_vote") = "1" then
        votetarget = request.form("target_vote")
        gameday = request.form("gameday")
        playerid = request.form("playerid")
        strSQL = "UPDATE actions SET valid=no WHERE day=" & gameday & " AND playerid = " & playerid & " and gameid = " & gameid & " and actiontypeid=2;"
        adoCon.execute strSQL,0,0
        strSQL = "INSERT INTO actions (playerid, [day], actiontypeid, targetplayerid, gameid, [date], valid) VALUES (" & playerid & ", " & gameday & ", 2, " & votetarget & ", " & gameid & ", NOW, yes);"
        'response.write(strSQL & "<br>")
        adoCon.execute strSQL,0,0
        strSQL = "SELECT actionid FROM actions WHERE valid=yes and day=" & gameday & " AND playerid = " & playerid & " and gameid = " & gameid & " and actiontypeid=2;"
        'response.write(strSQL & "<br>")
        rs2.open  strSQL, adoCon
        if rs2.eof then
            response.write("ERROR!")
        else
            actionid = rs2("actionid").value
        end if 
        rs2.close()
    end if

    themessage = request.form("message") 
    if themessage = "" and actionid <> -1 then themessage = "vote"
    thetitle = request.form("title")
    if themessage <> "" then
        qr_filter = request.Form("qr_filter")
        rawmessage = replace(themessage,"'","''")
        themessage = replace(themessage,"<","&lt;")        
        themessage = replace(themessage,">","&gt;")
	    themessage = ubb(themessage)
        themessage = replace(themessage,chr(13),"<br>")
        themessage = replace(themessage,"'","''")

        thetitle = replace(thetitle,"<","&lt;")        
        thetitle = replace(thetitle,">","&gt;")
        thetitle = replace(thetitle,"'","''")

        if request.form("edit")="y" then
		    strSQL = "UPDATE posts SET rawposttext='" & rawmessage & "', posttitle = '" & thetitle & "', posttext = '" & themessage & "' WHERE postid = " & request.form("postid") & ";"
		    adoCon.execute strSQL
        else
            strSQL = "INSERT INTO posts (posttitle, posttext, rawposttext, userid, posttime, gameid, actionid, filter) VALUES ('" & thetitle & "','" & themessage & "','" & rawmessage & "', " & userid & ", NOW, " & gameid & ", " & actionid & ", " & qr_filter & ");"
            'RESPONSE.WRITe(strSQL)
            adoCon.execute strSQL, 0,0
	    response.redirect("mygame.asp?g=" & gameid)
        end if
    end if
    
    'Create an ADO recordset object
    set RS = Server.CreateObject("ADODB.Recordset")  
    strSQL = "SELECT [open], owner, gamelocked,gamename, active, day from games WHERE gameid = " & gameid & ";"
    RS.Open strSQL, adoCon
    if not rs.eof then
        gameday = rs("day").value
        gamename = rs("gamename").value
        gameactive = rs("active").value
        gameowner = rs("owner").value
        gameopen = rs("open").value
        gamelocked = rs("gamelocked").value
    end if        
    RS.Close()

    if gameowner=userid and request.querystring("nextday") = "1" then
        gameday = gameday + 1
        strSQL = "UPDATE games SET [day] = " & gameday & " WHERE gameid = " & gameid & ";"
        'response.write(strSQL)
        adoCon.execute strSQL, 0, 0
        strSQL = "UPDATE posts (posttitle, userid, posttime, gameid) VALUES ('Day " & gameday & "', " & gameowner & ", NOW, " & gameid & ");"
        adoCon.execute strSQL, 0, 0
    end if
        
    roleid = -1
    strSQL = "SELECT players.roleid, playerid, active, description, rolename FROM players INNER JOIN roles ON roles.roleid = players.roleid WHERE userid = " & userid & " and gameid = " & gameid & ";"
    RS2.Open strSQL, adoCon
    if not rs2.eof then 
        roleid = rs2("roleid").value
        playerid = rs2("playerid").value
        playeractive = rs2("active").value
        playerdescription = rs2("description").value
        playerrolename = rs2("rolename").value
        playerdescriptionblock = "<big><big>" & playerrolename & "</big></big><br>" & playerdescription
    end if 
    rs2.Close()    
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" >
<head id="Head1">
    <title>Private Game Info: <%= gamename %></title>
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
	<span class="navbar">&gt; <a href="gamedisplay.asp?g=<%=gameid %>"><%= gamename %></a></span>
 &raquo; <strong><i>my game</i></strong>
		</td>	
	</tr>
	</table>

<!-- / breadcrumb, login, pm info -->

<table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center" style="border-bottom-width:0px">
<tr>
	<td class="tcat">Game<span class="normal"> : <%=gamename %></span> [day <%=gameday %>]</td>
</tr>
</table>

<% vieweduserid = userid 
%>

<!-- #include virtual="profile.inc" -->

<% rs.close %>

<!-- action list -->
<% 
    'Initialise the strSQL variable with an SQL statement to query the database
    strSQL = "SELECT game_actions.actiontypeid, game_actions.actionname, game_actions.targetname, game_actions.day, game_actions.roleid, game_actions.active, game_actions.rolename, game_actions.targetuserid FROM game_actions WHERE game_actions.gameid= " & gameid & " AND game_actions.userid = " & userid & ";"
    ' strSQL = "SELECT users.username, users.userid, players.playerid, players.active, players.roleid, players.description FROM users INNER JOIN players ON users.userid = players.userid where gameid=" & gameid & " ORDER BY active, username;"
    'Open the recordset with the SQL query 
    'response.Write(strSQL)
    RS.Open strSQL, adoCon
    'Loop through the recordset
    curday = -1
    firsttime = false
    Do While Not RS.EOF
    
    if curday <> rs("day").value then
        curday = rs("day").value
        
        if not firsttime then
        %></table><%
        end if
%>
<table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center" id="threadslist">
<thead>
	<tr align="center">
	  <td class="thead" width=25>&nbsp;</td>
	  <td class="thead" align="left" width=150><b>Day <%=curday%></b>: Actions</td>
	  <td class="thead" align="left">Player</td>
	  <td class="thead" width=175>Result</td>
	</tr>
</thead>
<%    
    end if
%>
 <tbody>
<tr align="center">
	<td class="alt2"><img src="images/phalla.gif" alt="" border="0" id="forum_statusicon_23" /></td>
	<td class="alt1Active" align="left" id="f23">
		<div>
		<%= rs("actionname").value %>
		</div>
 	</td>
	<td class="alt2" nowrap="nowrap" align=left>
		<%= rs("targetname").value %>
</td>
	<td class="alt1"><% 
	if rs("day").value = gameday then
	    if rs("actiontypeid").Value = 16 then
	        %>TRUSTED<%
	    else
	    %>PENDING<%
	    end if
	else
        Select Case rs("actiontypeid").value
            Case 1
                if rs("active").value then
                    response.write("ALIVE")
                else
                    response.write("DEAD")
                end if
            case 2
                if rs("active").value then
                    response.write("ALIVE")
                else
                    response.write("DEAD")
                end if
            case 3
                ' seer
		mysql = "SELECT * FROM actions WHERE [day]=" & rs("day").value & " AND gameid = " & gameid & " AND targetplayerid = " & playerid & " AND actiontypeid = 15 and valid=yes" ' 1 == regular vote
		'response.write(mysql)
		rs2.open mysql, adocon
		if rs2.eof then
			if rs("roleid").value = 17 then
				response.write("innocent") ' hack for godfather mechanic
			else
			    rs2.close
			    mysql = "SELECT protown FROM roles WHERE roleid = " & rs("roleid").value
        		rs2.open mysql, adocon
			    if rs2("protown").Value then
			        response.Write("innocent")
			    else
			        response.Write("guilty")
			    end if
                ' response.write(rs("rolename").value)
			end if
		else
			response.write("BLOCKED")
		end if
		rs2.close
                
            case 4
                if rs("active").value then
                    response.write("ALIVE")
                else
                    response.write("DEAD")
                end if
	    case 11
		' vigilante
                if rs("active").value then
                    response.write("ALIVE")
                else
                    response.write("DEAD")
                end if
	    case 13
	        ' tracker
		    mysql = "SELECT targetname FROM game_actions WHERE [day]=" & rs("day").value & " AND gameid = " & gameid & " AND userid = " & rs("targetuserid").value & " AND actiontypeid <> 1 and actiontypeid <> 14" ' 14 == claim; 1 == regular vote (removed  and active=yes because you should be able to query this regardless of the player being alive)
		    ' response.write(mysql)
		    rs2.open mysql, adocon
		    if rs2.eof then
			    response.write("none")
		    else
		        ' check for blocked
		        mysql = "SELECT * FROM actions WHERE [day]=" & rs("day").value & " AND gameid = " & gameid & " AND targetplayerid = " & playerid & " AND actiontypeid = 15 and valid=yes" ' 1 == regular vote
		        'response.write(mysql)
		        rs3.open mysql, adocon
		        if rs3.eof then
    			    response.write(rs2("targetname").value)
    		    else
    			    response.write("BLOCKED")
    		    end if
    		    rs3.close
		    end if
		    rs2.close
        case 14
            ' claim
            response.Write("none")
        case 15
            ' block
		    ' check for blocked
		    mysql = "SELECT * FROM actions WHERE [day]=" & rs("day").value & " AND gameid = " & gameid & " AND targetplayerid = " & playerid & " AND actiontypeid = 15 and valid=yes" ' 1 == regular vote
		    'response.write(mysql)
		    rs3.open mysql, adocon
		    if rs3.eof then
    		    ' blockable should be listed as an attribute to an action
    		    mysql = "SELECT targetname FROM game_actions WHERE [day]=" & rs("day").value & " AND gameid = " & gameid & " AND userid = " & rs("targetuserid").value & " AND actiontypeid<>2 and actiontypeid <> 1 and actiontypeid <> 14" ' 2==mafiavote; 14 == claim; 1 == regular vote (removed  and active=yes because you should be able to query this regardless of the player being alive)
    		    'response.write(mysql)
    		    rs2.Open mysql, adocon
    		    if rs2.EOF then 
    		        response.Write("no action")
    		    else
    		        response.Write("blocked them")
    		    end if
    		    rs2.close
    		else
    			response.write("YOU WERE BLOCKED")
    		end if
    		rs3.close
        case 16
            ' trust
            response.Write("trusted")
        case else
            response.write("unknown: " & rs("actiontypeid").value)
        end select
	end if
	 %>&nbsp;</td>
</tr>
</tbody>
<%
    'Move to the next record in the recordset 
    rs.MoveNext()
Loop
rs.close()
%>
</table>

<!-- /action list -->

<%
  if gamelocked and userid <> gameowner then
  %>
  <i>This game is currently locked.</i>
  <%
  else
%>

<br /><br />
<% if playeractive then
    strSQL = "SELECT users.username, players.playerid FROM users INNER JOIN players ON users.userid = players.userid where gameid=" & gameid & " and players.active=yes and users.userid <> " & userid & ";"
    RS2.Open strSQL, adoCon
    thedropdown = ""
    anytargets = false
    do while not rs2.eof
      curusername = rs2("username").value
      curplayerid = rs2("playerid").value      
      thedropdown = thedropdown + "<option value='" & curplayerid & "'>" & curusername & "</option>"
      anytargets = true
      rs2.movenext()
    loop
    rs2.close()

	strSQL = "select * FROM actiontypes INNER JOIN rules ON actiontypes.actiontypeid = rules.actiontypeid where roleid = " & roleid & " and privatepostchannel=no and private=yes;"
'	response.Write strSQL
    RS.Open strSQL, adoCon
    if not rs.eof and gameactive and gameday <> 0 then
%>
<form method=post action="mygame.asp?g=<%= gameid %>">
<table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
<tr>
	<td class="tcat">Game Actions<a name="sigpic">&nbsp;</a></td>
</tr>
<tr>
	<td class="panelsurround" align="center">
	<div class="panel">
		<div style="width:480px" align="left">
			
		
		
		<!-- upload control -->
		<fieldset class="fieldset">
			<legend>Private Actions</legend>
			
			<div style="padding:3px">
			<div class="fieldset">
			<div style="padding:3px">
<%                  
                    privatecount = 0       
                    do while not rs.eof
                    
                    allusedup = false
                    
                    if rs("timesperday")<>-1 then
                        mysql = "SELECT actionid FROM actions WHERE playerid = " & playerid & " and actiontypeid = " & rs("actiontypes.actiontypeid").value
                        'response.write mysql
                        rs2.Open mysql, adocon
                        actioncount = 0
                        while not rs2.eof
                            actioncount = actioncount + 1
                            rs2.movenext
                        wend
                        allusedup = actioncount >= rs("timesperday") ' this is really times per game
                        ' response.write "<br>" & rs2.RecordCount & " : " &  rs("timesperday")  & " : " & rs2.eof
                        rs2.close
                    end if
                    
    						targeted = rs("targeted").value
                            actionname = rs("actionname").value
                            actiontypeid = rs("rules.actiontypeid").value

                    if allusedup then
                        response.Write("Used up: " & actionname)
                    end if
                    
                        if rs("private").value and (not targeted or anytargets) and not allusedup then
%>
			<%
			if rs("timesperday").value = -1 then
			 %>			
			You may perform this special action once per day. 
			<% else %>
			You may perform this action <%= rs("timesperday").value %> time(s) per <b>game</b>.
		    <% end if %>		    
		    <br /><br />

                            <input type=hidden name="actiontypeid_<%= privatecount %>" value=<%= actiontypeid %> />
							<label for="qr_private_<%=privatecount %>"><input type="checkbox" name="qr_private_<%=privatecount %>" value="1" id="qr_private_<%=privatecount %>" accesskey="w" tabindex="4" /><%=actionname %></label>
							<%
							if targeted then 
							   response.write("<select class='bginput' name='target_private_" & privatecount & "'>" & thedropdown & "</select>")
							end if
							 %>
                            <br />							 
<%                      END IF 
                    privatecount=privatecount + 1
                    rs.movenext
				loop %>
			</div>
			<br />
				Note: Re-performing the day's action will overwrite the current pending request.
		
			
			</div>
			</div>
		</fieldset>
		<!-- / upload control -->
		
		</div>
	</div>
	
	<div style="margin-top:4px">
        <input type="hidden" name="gameday" value=<%=gameday %> />
        <input type="hidden" name="playerid" value=<%=playerid %> />
		<input type="submit" class="button" value="Perform Action" accesskey="a" tabindex="1" />
	</div>
	</td>
</tr>
</table>
</form>
<% end if 
    rs.close()
end if

' from here on, treat godfather like mafia
if roleid = 17 then roleid = 2

mysql = "SELECT rules.*, roles.rolename FROM rules INNER JOIN roles ON rules.roleid = roles.roleid WHERE privatepostchannel=yes"
if userid <> gameowner then
    mysql = mysql & " AND rules.roleid = " & roleid
else
    mysql = mysql & " AND rules.roleid <> 17 AND rules.roleid <> 3" ' HACK! godfather is a mafia... need to come up with a better way to denote this for sure... also.. seer (3) doesn't get a generic discussion as they are not a faction, but a trust network leader (perhaps remove their private forum tag?)
end if 

rs2.Open mysql, adocon

while not rs2.EOF 
'if roleid = 2 or userid = gameowner then ' mafia discussions 
  posts_title = rs2("rolename").value & " Discussion" 
  posts_filter = rs2("roleid").value
  if posts_filter = 3 then ' seer filter is special
    posts_filter = playerid * 1000 + 3
  end if 
  canpost = (playeractive or gameowner=userid or (not gameactive))
%>
<!-- #include virtual="posts.inc" -->
<br /><br />

<% qr_title = "Post " & rs2("rolename").value & " Comment" 
   qr_filter = rs2("roleid").value

    if qr_filter = 3 then ' seer
        ' seer filter = playerid*1000 (this is safe assuming that we never have more than 1000 roles)
        qr_filter = playerid * 1000 + 3
    end if
   
   if request.QueryString("q") <> "" then
    ' quote
    mysql = "SELECT rawposttext FROM posts WHERE postid = " & request.QueryString("q")
    rs.Open mysql, adocon
    if not rs.EOF then
        seededtext = "[quote]" & rs("rawposttext") & "[/quote]"
    end if
    rs.close
   end if
   
if canpost then
   
%>
<!-- #include virtual="quickreply.inc" -->
<% 

end if

if rs.State<>0 then rs.close

rs2.MoveNext
wend
rs2.close
 %>

<%
  sql = ""
  if gameowner=userid then
    sql = "SELECT users.userid, players.playerid, username FROM players INNER JOIN users ON players.userid = users.userid WHERE roleid=3 AND gameid = " & gameid
  elseif playerid <> "" then
    sql = "SELECT users.userid, actions.playerid, username FROM (actions INNER JOIN players ON actions.playerid = players.playerid) INNER JOIN users ON players.userid = users.userid WHERE actiontypeid=16 AND targetplayerid = " & playerid & " AND actions.gameid = " & gameid
  end if
  if sql <> "" then
    ' response.Write(sql)
    rs2.Open sql, adocon
    while not rs2.eof
        if rs.State<>0 then rs.close
        posts_title = "Seer <i>" & rs2("username").value & "</i> Trust Network Discussion" 
        posts_filter = rs2("playerid").value*1000+3 ' seer
        canpost = (playeractive or gameowner=userid or (not gameactive))
        %>
<!-- #include virtual="posts.inc" -->

        <br /><br />

        <% qr_title = "Post Seer <i>" & rs2("username").value & "</i> Trust Network Comment" 
        qr_filter = rs2("playerid").value * 1000 + 3 ' role

        if request.QueryString("q") <> "" then
            ' quote
            mysql = "SELECT rawposttext FROM posts WHERE postid = " & request.QueryString("q")
            rs.Open mysql, adocon
            if not rs.EOF then
                seededtext = "[quote]" & rs("rawposttext") & "[/quote]"
            end if
            rs.close
        end if

        if canpost then

            %>
<!-- #include virtual="quickreply.inc" -->
            <% 

        end if
        rs2.movenext
    wend
    rs2.close
   end if ' playerid<>""
 %>

</div>

<% 
end if ' game is locked
 %>

<br /><br />
</div></div></div>
<!--#include virtual="googletrack.inc" --> 
</body>
</html>
<%  
    set adoCon = Nothing%>
