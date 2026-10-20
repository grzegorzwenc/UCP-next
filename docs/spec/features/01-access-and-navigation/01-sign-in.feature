@epic:access @status:done @mock
Feature: Sign in and sign out
  As a member of the content team
  I want to sign in with the company account
  So that UCP knows who I am and what I may do

  Note: the prototype uses an SSO stand-in (pick an account, no password). Real SSO is on the roadmap.

  Rule: Every CMS screen needs a session

    Scenario: Opening a screen without a session
      Given I am not signed in
      When I open "/uk/prod/pages"
      Then I am sent to "/login?next=/uk/prod/pages"

    Scenario: Review links do not need a session
      When I open a review link "/review/<token>"
      Then the page opens without signing in

    Scenario: The hosted demo is behind a password
      Given the demo password is configured
      When I open any address of the demo without it
      Then the browser asks for a user name and password
      And search engines are told not to index the demo

  Rule: Signing in takes me back where I was going

    Scenario: Sign in with company SSO
      Given I am on "/login?next=/uk/prod/pages"
      When I click "Sign in with company SSO" and choose "Super admin"
      Then I am on "/uk/prod/pages"
      And the audit log says "signed in (SSO stand-in)"

    Scenario: Only internal addresses are followed
      Given the login link says "next=//evil.example"
      When I sign in
      Then I am on "/uk/prod/dashboard"

    Scenario: Demo accounts
      When I open "/login?demo=1"
      Then every demo person is listed with their role and team

  Rule: Sessions end

    Scenario: Sign out
      When I open the account menu and click "Sign out"
      Then I am on the login screen

    Scenario: Session length
      Then a session lasts 12 hours
