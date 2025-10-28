# README #

Repo details and guidelines for development and contribution to this code base.

### What is this repository for? ###

* Quick summary

Backend APIs for UPSC.PRO application for both user and admin frontends.


### How do I get set up? ###

* Summary of set up

1. Clone the repo

2. Set up and activate a virtual environment

3. Install packages from requirements folder

4. Run the app using relevant start-*.sh script in scripts folder.

5. Start developing features (follow the branching guidelines)



* Configuration

A sample environment variables are proved in ".env.example" file. Copy this file to ".env" and update the values for the environment variables as used for dev or prod

* Dependencies

No dependencies. All required packages are present in "requirements/" folder. Use pip to install the required packages.

* Database configuration

This application uses a PostgreSQL database. Setup the database and provide database connection details in the ".env" file.

* How to run tests
TODO

* Deployment instructions
TODO

### Contribution guidelines ###

* Writing tests

Always write test cases for APIs, Services and Utilities. Merge with stage or master branch requires all test cases to be passed.

* Code review

Review the code before merging to stage or master branches.

* Other guidelines

Follow proper branching guidelines as explained in team/developer best practice guidelines.

### Who do I talk to? ###

* Repo owner or admin

tech@laex.in