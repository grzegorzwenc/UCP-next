@epic:pages @status:done
Feature: Browse and create pages
  The site tree mirrors the folders of a market; new pages always start from a template so they are on-brand from the first click.

  Background:
    Given I am signed in to the "HSBC UK" market in "Production"

  Rule: US-02.01.1 · Find any page in the market
    As a content author
    I want to browse the folder tree and search the whole market
    So that I quickly find the page I need to work on

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

  Rule: US-02.01.2 · Create pages and folders from on-brand templates
    As a content author
    I want to create folders and new pages from a template allowed in my market, where I have Edit
    So that the site structure stays tidy and every page starts on-brand

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

    Scenario: Read-only folder
      Given I don't have Edit on "Borrowing"
      Then the folder shows "Read-only in this folder"
      And there is no "New page" or "New folder"
