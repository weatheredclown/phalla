<%
    If Session("userid") = "" Then
        '        Response.Redirect("login.asp")
        Session("userid")=-1
    End If
    
    userid = Session("userid")

   
    vieweduserid = Request.QueryString("u")
    If vieweduserid = "" Then vieweduserid = 1

    'Create an ADO connection object
    Dim adoCon
    set adoCon = Server.CreateObject("ADODB.Connection")
    
    'Set an active connection to the Connection object using a DSN-less connection
    adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))

    if(userid<>-1) and request.form("edit")="y" then
        email = replace(request.form("email"),"'","''")
	    sig = replace(request.form("sig"),"'","''")
	    avatar = replace(request.form("avatar"),"'","''")
	    location = replace(request.form("location"),"'","''")
	    title = replace(request.form("title"),"'","''")
        mySQL = "UPDATE users SET [email]='" & email &"', [sig]='" & sig & "', [image]='" & avatar & "', [location]='" & location & "', [title]='" & title & "' WHERE userid = " & userid & ";"
        'response.write(mysql)
        adoCon.execute mySQL, 0, 0
    end if

    'Create an ADO recordset object
    set RS = Server.CreateObject("ADODB.Recordset")  
    
    if request.querystring("creategame")="y" and request.QueryString("gamename") <> "" then
    
        gamename = replace(request.querystring("gamename"),"'","''")
        description = replace(request.querystring("description"),"'","''")
        
        mySQL = "SELECT * FROM games WHERE gamename = '" & gamename & "';"
        rs.Open mySQL, adoCon
        uniquename = rs.eof
        rs.Close
        
        if uniquename then
            mySQL = "INSERT INTO games (gamename, active, [day], [open], description, owner) VALUES ('" & gamename & "', yes, 0, yes, '" & description & "', " & vieweduserid & ");"
            adoCon.execute mySQL,0, 0

            mySQL = "SELECT max(gameid) as val from games"
            rs.open mySQL, adoCon
                
            thegameid = rs("val").value

            rs.close
        end if        
    end if    
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head id="Head1">
    <title>Member Info</title>
    <link rel="stylesheet" type="text/css" href="phalla.css" id="vbulletin_css" />
</head>
<body>
    <!--#include virtual="mafia/logo.asp" -->
    <!-- content table -->
    <!-- open content container -->
    <div align="center">
        <div class="page" style="width: 98%; text-align: left">
            <div style="padding: 0px 10px 0px 10px">
                <!-- breadcrumb, login, pm info -->
                <table class="page" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
                    <tr>
                        <td class="page" valign="bottom" width="100%">
                            <span class="navbar"><a href="games.asp" accesskey="1">List of Games</a></span>
                            <span class="navbar">&gt; <a href="userlist.asp">Member List</a></span> &raquo;
                            <strong>View Profile</strong>
                        </td>
                    </tr>
                </table>
                <!-- / breadcrumb, login, pm info -->
                <form method="post" name="vbform">
                    <input type="hidden" name="edit" value="y" />
                    <table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
                        <tr>
                            <td class="tcat">
                                View Profile<span class="normal"></span></td>
                        </tr>
                    </table>
                    <!-- #include virtual="mafia/profile.inc" -->
                    <% 
cancreate=false
if not rs.eof then 
if rs("userid").value = userid then
cancreate=true
                    %>
                    <tr>
                        <td class="tcat">
                            Edit Profile</td>
                    </tr>
                    <tr>
                        <td class="panelsurround" align="left">
                            <div class="panel">
                                <table>
                                    <tr>
                                        <td>
                                            email:</td>
                                        <td>
                                            <input type="text" class="bginput" name="email" value="<%= rs("email").value %>" />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            sig:</td>
                                        <td>
                                            <input type="text" class="bginput" name="sig" value="<% 
	    mysig = rs("sig").value
	    if mysig<>"" then mysig = replace(mysig,"'","&#39;") 
	    response.write(mysig)
	    %>" />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            avatar:</td>
                                        <td>
                                            <input type="text" class="bginput" name="avatar" value="<%= rs("image").value %>" />
                                            (or <a href="uploadform.htm">upload file</a>)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            location:</td>
                                        <td>
                                            <input type="text" class="bginput" name="location" value="<%= rs("location").value %>" />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            title:</td>
                                        <td>
                                            <input type="text" class="bginput" name="title" value="<%= rs("title").value %>" />
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="panelsurround" align="center">
                            <div style="margin-top: 4px">
                                <input type="hidden" name="s" value="" />
                                <input type="hidden" name="do" value="updatesignature" />
                                <input type="hidden" name="url" value="http://forums.penny-arcade.com/usercp.php" />
                                <input type="hidden" name="MAX_FILE_SIZE" value="2097152" />
                                <input type="submit" class="button" value="Save Profile" accesskey="s" tabindex="1" />
                                <!--<input type="submit" class="button" value="Preview Signature" name="preview" accesskey="r" tabindex="1" />	-->
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                        </td>
                    </tr>
                    <% 
end if %>
                    </table>
                </form>
                <!-- game summary -->
                <%= rs.close %>
                <br />
                <table class="tborder" cellpadding="4" cellspacing="1" border="0" width="100%" align="center">
                    <tr>
                        <td class="tcat" width="50%">
                            Played Games</td>
                        <td class="tcat" width="50%">
                            Run Games</td>
                    </tr>
                    <tr valign="top">
                        <td class="panelsurround" align="center">
                            <div class="panel">
                                <div align="left">
                                    <%
    mysql = "SELECT games.[open], players.userid, players.playerid, players.active as playeractive, games.active, games.gamename, games.gameid, games.day FROM players INNER JOIN games ON players.gameid = games.gameid WHERE players.userid = " & vieweduserid & " ORDER BY games.active, games.[open], gamename"
    RS.Open mysql, adocon
    stage = 0
    if rs.EOF then
                                    %>
                                    <i>None</i>
                                    <%
    end if
    while not rs.eof
    
        if rs("active").value and rs("day").value=0 and stage<>1 then
            stage = 1
                                    %>
                                    <fieldset class="fieldset">
                                        <legend>Open</legend>
                                        <table cellpadding="0" cellspacing="3" border="0">
                                            <%
		end if

        if rs("active").Value and rs("day").Value<>0 and stage<>3 then
            if stage <> 0 then
                                    %>
                                        </table>
                                    </fieldset>
                                    <%      
            end if 
            
            stage = 3
            %>
            <fieldset class="fieldset">
            <legend>Running</legend>
            <table cellpadding="0" cellspacing="3" border="0">
            <%		
        end if
        
	    if (not rs("active").value) and stage<>2 then
            if stage <> 0 then
                                    %>
                                        </table>
                                    </fieldset>
                                    <%      
            end if 
            stage = 2
                                    %>
                                    <fieldset class="fieldset">
                                        <legend>Game Over</legend>
                                        <table cellpadding="0" cellspacing="3" border="0">
                                            <%
	    end if
                                            %>
                                            <tr>
                                                <td>
<%
gamelinkstyle = ""
if not rs("playeractive").value then 
	gamelinkstyle = "color:gray"
elseif (not rs("open").value) and rs("active").value and rs("userid").value = userid then
	mysql = "SELECT actiontypeid FROM actions RIGHT JOIN games ON games.gameid = actions.gameid WHERE games.day = actions.day AND playerid = " & rs("playerid").value
	' response.write(mysql)
	rs2.open mysql, adocon
	if rs2.eof then gamelinkstyle = "color:yellow"
	rs2.close
end if
%>
                                                    <a href="gamedisplay.asp?g=<%=rs("gameid") %>" style="<%= gamelinkstyle %>">
                                                        <%=rs("gamename").value %>
                                                        <% if not rs("playeractive").value then response.Write(" <i>(dead!)</i>") %>
                                                    </a>
                                                </td>
                                            </tr>
                                            <% rs.MoveNext
wend  
rs.close
      if stage<>0 then            
                                            %>
                                        </table>
                                    </fieldset>
                                    <%      end if %>
                                </div>
                            </div>
                        </td>
                        <td class="panelsurround" align="center">
                            <div class="panel">
                                <div align="left">
                                    <%
    mysql = "SELECT games.active, games.gamename, games.gameid, games.day FROM games WHERE games.owner = " & vieweduserid & " ORDER BY games.active, games.[open], gamename"
    RS.Open mysql, adocon
    stage = 0
    if rs.EOF then
                                    %>
                                    <i>None</i>
                                    <%
    end if
    while not rs.eof
    
        if rs("active").value and rs("day").value=0 and stage<>1 then
            stage = 1
                                    %>
                                    <fieldset class="fieldset">
                                        <legend>Open</legend>
                                        <table cellpadding="0" cellspacing="3" border="0">
                                            <%
		end if

        if rs("active").Value and rs("day").Value<>0 and stage<>3 then
            if stage <> 0 then
                                    %>
                                        </table>
                                    </fieldset>
                                    <%      
            end if 
            
            stage = 3
            %>
            <fieldset class="fieldset">
            <legend>Running</legend>
            <table cellpadding="0" cellspacing="3" border="0">
            <%		
        end if
        
	    if (not rs("active").value) and stage<>2 then
            if stage <> 0 then
                                    %>
                                        </table>
                                    </fieldset>
                                    <%      
            end if 
            stage = 2
                                    %>
                                    <fieldset class="fieldset">
                                        <legend>Game Over</legend>
                                        <table cellpadding="0" cellspacing="3" border="0">
                                            <%
	    end if
                                            %>
                                            <tr>
                                                <td>
                                                    <a href="gamedisplay.asp?g=<%=rs("gameid") %>">
                                                        <%=rs("gamename").value %>
                                                    </a>
                                                </td>
                                            </tr>
                                            <% rs.MoveNext
wend  
rs.close
      if stage<>0 then            
                                            %>
                                        </table>
                                    </fieldset>
                                    <%      end if %>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <% if cancreate then %>
                    <tr>
                        <td colspan="2" class="tcat">
                            Create Game</td>
                    </tr>
                    <tr>
                        <td colspan="2" class="panelsurround">
                            <div class="panel">
                                <form>
                                    <input type="hidden" name="u" value="<%=userid %>" />
                                    <input type="hidden" name="creategame" value="y" />
                                    <table>
                                        <tr>
                                            <td>
                                                Name:</td>
                                            <td>
                                                <input class="bginput" name="gamename" /></td>
                                        </tr>
                                        <tr>
                                            <td>
                                                Description:</td>
                                            <td>
                                                <input class="bginput" name="description" /></td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <input type="submit" class="button" value="create game" /></td>
                                        </tr>
                                    </table>
                                </form>
                            </div>
                        </td>
                    </tr>
                    <%  end if%>
                </table>
                <br />
                <!-- /game summary -->
            </div>
        </div>
    </div>
<!--#include virtual="mafia/googletrack.inc" --> 
</body>
</html>
<%end if 
    set adoCon = Nothing%>
