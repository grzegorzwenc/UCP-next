@epic:pages @status:done
Feature: Browse and create pages
  As a content author
  I want to find pages in the site tree and create new ones from a template
  So that the site structure stays tidy and every page starts on-brand

  Background:
    Given I am signed in to the "HSBC UK" market in "Production"

  Rule: The site tree mirrors the folders of the market

    Scenario: Browsing folders
      When I open Pages
      Then I see the folder tree on the left and the pages of the current folder in a table
      And the table shows Name, Status, URL, Template and Updated
      And translated pages show their locale and a "Source:" link

    Scenario: Search across the market
      When I type "isa" into "Find a page by title or URL"
      Then pages from every folder that match are listed

    Scenario: Long folders load in parts
      Given a folder has 120 pages
      Then 50 are shown with "Show 50 more"

  Rule: Only people with Edit change a folder

    Scenario: Read-only folder
      Given I don't have Edit on "Borrowing"
      Then the folder shows "Read-only in this folder"
      And there is no "New page" or "New folder"

  Rule: New pages start from a template

    Scenario: Creating a page
      When I click "New page"
      And I enter the title "Regular saver"
      Then the URL name becomes "regular-saver"
      When I choose the "Product page" template and click "Create and open"
      Then the page builder opens with the template's components
      And the masthead heading says "Regular saver"
      And I am the first author of the page

    Scenario: Templates limited to other markets are not offered
      Given the "Rates page" template is for Hong Kong only
      When I click "New page" in the UK market
      Then "Rates page" is not in the template list

    Scenario: Starting from the template library
      When I click "Use template" on "Campaign landing"
      Then the New page dialog opens with "Campaign landing" chosen

    Scenario: Creating a folder
      When I click "New folder" and enter "Insurance"
      Then the folder "Insurance" appears in the tree
