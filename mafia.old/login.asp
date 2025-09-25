<% 
set adoCon = Server.CreateObject("ADODB.Connection")
adoCon.Open("Provider=Microsoft.Jet.OLEDB.4.0; Data Source=" & Server.MapPath("phalla.mdb"))

    if request.QueryString("do") = "logout" then
        session("username") = ""
        Session("userid") = -1
        Response.Cookies("userid") = -1
        Response.Cookies("username") = ""
    End If

    If Request.Form("newaccount") = "y" Then        
        username = Request.Form("username")
        password = Request.Form("password")
        repassword = Request.Form("repassword")
        email = Request.Form("email")

        username = replace(username,"'", "''")
        password = replace(password,"'", "''")
        email = replace(email,"'", "''")

        If password <> repassword Then
            errorstr = "passwords don't match!"
        ElseIf password = "" Then
            errorstr = "no password"
        Else
            set myrs = Server.CreateObject("ADODB.Recordset")
            mysql = "SELECT users.userid FROM users WHERE lcase(username)='" + lcase(username) + "';"
            myrs.open mysql, adoCon
            If (Not myrs.eof) Then
                errorstr = "username already in use!"
                myrs.close()
            Else
                myrs.close()
                
                mysql = "INSERT INTO users (username, email, [password], signupdate) VALUES ('" & username & "', '" & email & "', '" & password & "', NOW);"
                'mysql = "INSERT INTO users ( username, email, [password] ) SELECT '" & username & "' as e1, '" & email & "' as e2, '" & password & "' as e3;"
                adoCon.execute mysql, 0, 0
            End If
        End If
    End If
    username = Request.Form("username")
    If username <> "" Then
        password = Request.Form("password")

        username = replace(username,"'", "''")
        password = replace(password,"'", "''")

        'Create an ADO recordset object
        set rsPhalla = Server.CreateObject("ADODB.Recordset")
  
        'Initialise the strSQL variable with an SQL statement to query the database
        strSQL = "SELECT users.userid FROM users WHERE lcase(username)='" + lcase(username) + "' and password='" + password + "';"

        ' Response.Write(strSQL)
        
        'Open the recordset with the SQL query 
        rsPhalla.Open strSQL, adoCon

        If rsPhalla.EOF Then
            if errorstr = "" then errorstr = "Unknown username or incorrect password"
            rsPhalla.Close()
        Else
            Session("userid") = rsPhalla("userid").Value
            Session("username") = username
            if request.Form("remember")="y" then
                Response.Cookies("userid") = Session("userid")
	            Response.Cookies("userid").Expires = Date() + 10
                Response.Cookies("username") = Session("username")
	            Response.Cookies("username").Expires = Date() + 10
            else
                Response.Cookies("userid") = -1
                Response.Cookies("username") = ""
            end if	        
            rsPhalla.Close()
            Response.Redirect("games.asp")
        End If
        set adoCon = Nothing
    End If
    %>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" >
<head>
    <title>Login</title>
    <link rel="stylesheet" type="text/css" href="/phalla.css" id="vbulletin_css" />
</head>
<body>
<%  If Request.QueryString("signup") = "y" Then%>
<font color='cyan'><b><%= errorstr %></b></font><br />
<form action="login.asp?signup=y" method=post>
        <input type="hidden" name="newaccount" value="y" />
		<table cellpadding="0" cellspacing="3" border="0">
		<tr>
			<td class="smallfont"><label for="navbar_username">Username:</label></td>

			<td><input type="text" class="bginput" style="font-size: 11px" name="username" id="navbar_username" size="20" accesskey="u" tabindex="101" /></td>
			<td class="smallfont" colspan="2" nowrap="nowrap"><label for="cb_cookieuser_navbar"> <!-- <input type="checkbox" name="cookieuser" value="1" tabindex="103" id="cb_cookieuser_navbar" accesskey="c" />Remember Me?</label>--></td>
		</tr>
		<tr>
			<td class="smallfont"><label for="navbar_password">Password:</label></td>
			<td><input type="password" class="bginput" style="font-size: 11px" name="password" id="navbar_password" size="20" tabindex="102" /></td>
		</tr>
		<tr>
			<td class="smallfont"><label for="navbar_repassword">Retype Password:</label></td>
			<td><input type="password" class="bginput" style="font-size: 11px" name="repassword" id="navbar_repassword" size="20" tabindex="103" /></td>
		</tr>
		<tr>
			<td class="smallfont"><br /><br /></td>
		<tr>
			<td class="smallfont"><label for="navbar_email">Email Address:</label></td>
			<td><input type="text" class="bginput" style="font-size: 11px" name="email" id="navbar_email" size="20" tabindex="104" /> <small>(not required)</small></td>
		</tr>
		<tr>
			<td><br /><input type="submit" class="button" value="Sign Up!" tabindex="105" title="Enter your username and password in the boxes provided to login, or click the 'register' button to create a profile for yourself." accesskey="s" /></td>
		</tr>

		</table>
</form>
<% else %>
<font color='cyan'><b><%= errorstr %></b></font><br />
<!--#include virtual="mafia/login_form.inc" --> 
&nbsp;&nbsp;&nbsp;&nbsp;<b><a href="login.asp?signup=y">sign up!</a></b><br />
<% end if %>
<br><br><br>
&nbsp;&nbsp;&nbsp;<a href="games.asp">List of Games</a>
<!--#include virtual="mafia/googletrack.inc" --> 
</body>
</html>
