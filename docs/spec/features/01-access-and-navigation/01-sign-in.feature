@epic:access @status:done @mock
Feature: Sign in and sign out
  Signing in with the company account tells UCP who someone is and what they may do.

  Note: the prototype uses an SSO stand-in (pick an account, no password). Real SSO is on the roadmap.

  Rule: US-01.01.1 · Sign in with the company account
    As a content author
    I want to sign in with my company account and land where I was going
    So that UCP knows who I am and only signed-in people reach the CMS

    Scenario: Opening a screen without a session
      Given I am not signed in
      When I open "/uk/prod/pages"
      Then I am sent to "/login?next=/uk/prod/pages"

    Scenario: Sign in with company SSO
      Given I am on "/login?next=/uk/prod/pages"
      When I click "Sign in with company SSO" and choose "Super admin"
      Then I am on "/uk/prod/pages"
      And the audit log says "signed in (SSO stand-in)"

    Scenario: Only internal addresses are followed
      Given the login link says "next=//evil.example"
      When I sign in
      Then I am on "/uk/prod/dashboard"

    Scenario: Sign out
      When I open the account menu and click "Sign out"
      Then I am on the login screen

    Scenario: Session length
      Then a session lasts 12 hours

  Rule: US-01.01.2 · Open a review link without an account
    As a guest reviewer
    I want to open a review link without signing in
    So that I can give feedback on a page without a CMS account

    Scenario: Review links do not need a session
      When I open a review link "/review/<token>"
      Then the page opens without signing in

  Rule: US-01.01.3 · Try the private demo as any person
    As a business owner
    I want the hosted demo kept behind a password and to try it as any demo person
    So that I can evaluate every role without exposing the demo to the public

    Scenario: The hosted demo is behind a password
      Given the demo password is configured
      When I open any address of the demo without it
      Then the browser asks for a user name and password
      And search engines are told not to index the demo

    Scenario: Demo accounts
      When I open "/login?demo=1"
      Then every demo person is listed with their role and team
