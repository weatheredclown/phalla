# Legacy Code Conventions (`mafia.old/`)

This document outlines the coding practices, architecture, and conventions of the classic ASP application in this directory. It serves as a technical reference for developers modernizing the application to the new Firebase-hosted version in `mafia.new/`.

## Technology Stack

-   **Server-side Scripting**: Classic ASP with VBScript.
-   **Database**: Microsoft Access (`phalla.mdb`).
-   **Web Server**: Assumed to be IIS (Internet Information Services).

## Architecture & Patterns

### Database Interaction

-   **Connection**: Database connections are made using `ADODB.Connection` objects.
-   **Connection Management**: Connections are typically opened at the top of an `.asp` file and closed at the end. There is no centralized connection pooling.
-   **Queries**: SQL queries are constructed by concatenating strings.
    -   **Example**: `strSQL = "SELECT * FROM users WHERE userid = " & session("userid")`
-   **Security Warning**: This approach is highly vulnerable to SQL injection. User-provided input is often escaped for single quotes (`'`) but this is not a comprehensive defense.

### State Management

-   **Session**: User state, particularly authentication, is managed via the built-in ASP `Session` object.
    -   `Session("userid")`: Stores the logged-in user's ID. A value of `-1` indicates a logged-out user.
    -   `Session("username")`: Stores the logged-in user's name.
-   **Initialization**: The file `getuserid.inc` is included at the top of most pages. It is responsible for checking for an active session and, if one is not present, attempting to initialize it from cookies.
-   **Cookies**: A "Remember Me" feature sets `userid` and `username` cookies to persist login across browser sessions.

### Code Structure

-   **File Types**:
    -   `.asp`: Main pages containing a mix of VBScript, HTML, and server-side includes. They handle application logic, data retrieval, and presentation.
    -   `.inc`: Reusable code snippets included in `.asp` files using `<!--#include virtual="..." -->` or `<!--#include file="..." -->`. These are used for common elements like headers, footers, and session checking.
-   **Code Style**:
    -   VBScript logic is embedded within HTML using `<% ... %>` delimiters.
    -   There is no separation of concerns; database logic, business logic, and presentation are all mixed within the same file.
    -   Variable naming is inconsistent but often uses camelCase or lowercase with underscores.

### Security Practices

-   **Authentication**: The `login.asp` page handles user authentication by comparing user-supplied credentials against plaintext values in the `users` table of the database.
-   **Password Storage**: Passwords are stored in the database as plaintext. **This is a critical security flaw.**
-   **SQL Injection**: As mentioned, the application is vulnerable to SQL injection due to dynamic query string construction.

### Key Files & Directories

-   `phalla.mdb`: The Microsoft Access database file containing all application data.
-   `login.asp`: Handles user login, logout, and new account creation.
-   `gamedisplay.asp`: The main view for a game, showing players, posts, and game state.
-   `getuserid.inc`: Included on most pages to manage user session state.
-   `posts.inc`: A reusable component for displaying a thread of posts.
-   `quickreply.inc`: A reusable component for the post reply form.

This summary should guide the process of re-implementing features in the new system, ensuring that legacy behaviors are understood and that legacy security flaws are not replicated.