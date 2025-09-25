<!-- controls above postbits -->
<!--
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:3px">
  <tr valign="bottom">

    <td class="smallfont">
    </td>

    <td align="right">
      <div class="pagenav" align="right">
        <table class="tborder" cellpadding="3" cellspacing="1" border="0">
          <tr>
            <td class="vbmenu_control" style="font-weight:normal">Page 1 of 2</td>


            <td class="alt2">
              <span class="smallfont" title="Showing results 1 to 25 of 32">
                <strong>1</strong>
              </span>
            </td>
            <td class="alt1">
              <a class="smallfont" href="showthread.php?t=64505&amp;page=2" title="Show results 26 to 32 of 32">2</a>
            </td>
            <td class="alt1">
              <a class="smallfont" href="showthread.php?t=64505&amp;page=2" title="Next Page - Results 26 to 32 of 32">&gt;</a>
            </td>

            <td class="vbmenu_control" title="showthread.php?t=64505">
              <a name="PageNav"></a>
            </td>
          </tr>
        </table>
      </div>
    </td>
  </tr>
</table>
-->
<!-- / controls above postbits -->


<div id="posts">

            	<!-- this is not the last post shown on the page -->	
                <table id="Table1" class="tborder" cellpadding="4" cellspacing="0" border="0" width="100%" align="center" style="margin-top:-5px;">
                <tr valign="top">
   	             <td class="alt4" style="border-top:2px solid #3B4970;" ><%= posts_title %></td>
	            </tr>
	            </table>
<%
  postcount=1
  topquery = ""
  topfilter = "" 
  if request.querystring("after") <> "" then topfilter = " AND postid > " & request.querystring("after") & " "
  if request.querystring("show") <> "" then topquery = "TOP " & request.querystring("show")
  if request.querystring("startcount") <> "" then postcount = CInt(request.querystring("startcount"))

  strSQL = "SELECT " & topquery & " fullposts.*, namedplayers.playerid, namedplayers.username as targetname FROM namedplayers RIGHT JOIN fullposts ON namedplayers.playerid = fullposts.targetplayerid where fullposts.gameid=" & gameid & " and fullposts.filter = " & posts_filter & topfilter & " order by postid;"
  RS.open strSQL, adoCon
  alt1 = false
  Do While Not RS.EOF
  
    if alt1 then
      alt1 = false  
      altclass = "alt1" 
      altcolor ="#18335E" 
      altstyle ="border-top:2px solid " & altcolor & ";" 
    else
      altclass = "alt3" 
      altcolor ="#3B4970"
      altstyle="border-top:2px solid " & altcolor & ";" 
      alt1 = true 
    end if
  
 %>
<!-- post #<%= rs("postid").value %> -->

	<!-- open content container -->

	<div id="edit<%=rs("postid").value%>" style="padding:0px 0px 4px 0px">
	<!-- this is not the last post shown on the page -->	



<table id="post<%=rs("postid").value%>" class="tborder" cellpadding="4" cellspacing="0" border="0" width="100%" align="center" style="margin-top:-5px;">
<tr valign="top">
   	  
	    <td class="<%=altclass%>" width="145" style="<%=altstyle%>" >
	  

    <div style="margin:-4px 8px 8px -4px;background-color:<%=altcolor%>" class="rounded"><div style="padding:5px;">
				
				
				<div class="pbit">
				  <div id="postmenu_<%=rs("postid").value%>" ><a style="font-size:13px;font-weight:bold;text-decoration:none;" href="member.asp?u=<%=rs("userid").value %>"><%=RS("username").value %></a></div> 
				</div>
			 
						<div class="pbit">
			  <div class="smallfont"><%=rs("title").value %></div>
			</div>
<% if rs("image").value = "" or isnull(rs("image").value) then %>	
&nbsp;
<% else %>
				<div class="pbit"><div>
					    <a href="member.asp?u=<%= rs("userid").value %>"><img src="<%=rs("image").value%>" alt="<%= rs("username").value %>"'s Avatar" class="avatar" border="0" /></a>
				      </div>
				</div>
<% end if %>	
<% if rs("userid").value = gameowner then  %><font color="yellow">GAME MASTER</font><% end if %>
<% if userid = 15 or gameowner = userid then %>
<a href="gamedisplay.asp?g=<%=gameid%>&delete=<%=rs("postid").value%>"><font color=red>delete</font></a>
<% end if %>
<% 
   varlocation = rs("location").value   
   if varlocation = "" or vartype(varlocation)=0 or vartype(varlocation)=1 then %>	
&nbsp;
<% else %>
			<div class="smallfont">
				&nbsp;<br />
				<div class="pbit">
				 Location: <%= rs("location").value %>
				</div>
				<br />
			</div>
<% end if %>			
			</div></div>
<br />
						
	</td>
   	  
	    <td class="<%=altclass%>" style="<%=altstyle%>" id="td_post_<%=rs("postid").value%>">

			<!-- icons and title -->
			<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="left">
			<div class="smallfont">
				
				<strong><%= rs("posttitle").value %></strong>
				
					</div>
				
				<hr size="1" style="color:silver" />
				</td></tr></table>
			<!-- / icon and title -->
		
		
		<!-- message -->
    <div class="smallfont">
				<img class="inlineimg" src="images/doc.gif" alt="Old" border="0" />	<%=rs("posttime").value %></div>
		<div id="post_message_<%=rs("postid").value%>" style="margin:10px 3px;"><table cellspacing="0"><tr><td><img src="/clear.gif" alt="" width="1" height="99" /></td><td class="postbody" valign="top"><%= rs("posttext").value %></td></tr></table></div>
		<!-- / message -->
	
		
		
		<table width="100%" cellspacing="0"><tr>
	    
   	  
		<td class="<%=altclass%>" width="90%">
	  
		
	<table border="0" cellpadding="4" cellspacing="0" width="98%">
	<tbody><tr><td>

<% 
if rs("sig").value = ""  then 
%>		
		&nbsp;
<% else %>		
		<!-- sig -->
			<div>				
				__________________<br />
				<font size="1"><%=rs("sig").value %></font>
			</div>
		<!-- / sig -->
<% end if %>
		
		</td>
		<td valign="bottom" align="right" nowrap="nowrap">
				
	
					<!-- controls -->
<% if not (rs("actiontypeid").value = "") then %>
    <% if rs("actiontypeid").value = 1 or rs("actiontypeid").value = 2 then %>
        <b><font color="<%
        if rs("valid").value then
            response.write("red")
        else
            response.write("lime")
        end if 
        %>">!<%if not rs("valid").value then response.write("retracted ") %>vote <%=rs("targetname").value%></font></b>
    <% elseif rs("actiontypeid").value = 14 then 
        ' claim
          strsql = "SELECT [comment] FROM actions INNER JOIN posts ON posts.actionid=actions.actionid WHERE playerid = " & rs("targetplayerid").value & " AND actions.gameid = " & gameid & " AND posts.postid = " & rs("postid").value & " AND actiontypeid = 14"
          'response.write(strsql)
          rs2.open strsql, adocon
        if rs("valid").value then claimstr ="claim" else claimstr="unclaim"
          %>
      <b>
        <font <%if rs("valid").value then%>color='yellow'<%end if%>><%=claimstr%>&nbsp;<%=rs2("comment").value%></font></b>
      <%
          rs2.close
       else %>
	    <%= rs("actiontypeid").value %> - <%= rs("targetname").value %>
    <% end if %>
<% end if %>
<% if userid = rs("userid") and (playeractive or userid=gameowner) then%> <a href="editpost.asp?p=<%=rs("postid").value%>"><img src="images/edit.gif" alt="Edit Post" border="0" align="middle" /></a> <% end if %>
<% if canpost then%> <a href="<%=Request.ServerVariables("URL")%>?g=<%=gameid%>&q=<%=rs("postid").value%>#reply"><img src="images/quote.gif" alt="Reply With Quote" border="0" align="middle" /></a> <% end if %>
			 | #<strong><%= postcount %></strong>
			
			
			<!-- / controls --> 
		</td></tr></tbody></table>
		</td></tr>
		</table>

	</td>
</tr>
</table>
	</div>
	
<!-- / close content container -->

<!-- / post #<%= rs("postid").value %> -->
<%
    rs.MoveNext()
    postcount = postcount + 1
Loop
rs.close()
 %>
