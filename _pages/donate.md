---
permalink: /donate/
title: "Donate"
---



Tempor velit sint sunt ipsum tempor enim ad qui ullamco. Est dolore anim ad velit duis dolore minim sunt aliquip amet commodo labore. Ut eu pariatur aute ea aute excepteur laborum. Esse ea esse excepteur minim mollit qui cillum excepteur ex dolore magna. Labore deserunt fugiat incididunt incididunt sint ea. Consequat dolore aute laboris quis proident quis non et est consectetur ex eiusmod sit culpa.

Cupidatat ea do et in excepteur in. Ad nostrud ut est esse eu duis ea sunt eiusmod. Aliquip tempor veniam sint elit fugiat. Velit incididunt laboris amet incididunt labore dolore irure velit excepteur commodo deserunt laborum. Consectetur eu fugiat veniam veniam Lorem labore magna eiusmod. Ea occaecat reprehenderit pariatur consectetur minim labore ut aliquip.

[![Support us on Patreon](https://img.shields.io/badge/Support%20Us-Patreon-FF424D?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/rcmp)


You said:
im using github pages and mmistakes/minimal-mistakes to create website.
Everything is good but one thing! How do I remove "Recent Posts" from the main page?

ChatGPT said:

To remove the "Recent Posts" section from the main page in your GitHub Pages website using the mmistakes/minimal-mistakes theme, follow these steps:
Solution 1: Update index.md

    Navigate to your repository on GitHub or your local project files.

    Locate and open the index.md file inside the root directory or _pages folder.

    Check if there is a layout: home in the front matter. It should look like this:

---
layout: home
title: "Home"
---

Add the following line to disable the "Recent Posts" section:

    ---
    layout: home
    title: "Home"
    show_excerpts: false
    entries_layout: none
    ---

        entries_layout: none → This removes the "Recent Posts" section.

    Save and commit the changes.

Solution 2: Modify _config.yml

    Open the _config.yml file in your repository.
    Look for the section related to defaults or homepage settings.
    Add or modify the settings like this:

    defaults:
      - scope:
          path: ""
          type: "posts"
        values:
          show_excerpts: false
          entries_layout: none

    Save and commit the changes.

Solution 3: Hide via CSS (Alternative)

If the above methods do not work, you can hide it using CSS by adding this to your assets/css/custom.css (or _sass/custom.scss):

h2.archive__subtitle {
display: none;
}

This method will hide the "Recent Posts" text without modifying the theme's logic.

After making any changes, push the updates to GitHub and wait a few minutes for the changes to reflect on your site.

Let me know if you need further help! 🚀
You said:
Can you give me beautiful patreon link?
2/2
ChatGPT said:

Sure! Here’s a beautiful Patreon link you can use for your website:
🔗 Support us on Patreon!

(Replace the URL with your actual Patreon link.)
Fancy Button for Websites

If you want a nice Patreon button on your GitHub Pages website, you can use this HTML:

<a href="https://www.patreon.com/YOUR_USERNAME" target="_blank" style="
display: inline-block;
background-color: #FF424D;
color: white;
font-weight: bold;
padding: 10px 20px;
border-radius: 8px;
text-decoration: none;
font-size: 18px;
box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
">
❤️ Support us on Patreon
</a>

Replace "YOUR_USERNAME" with your Patreon username.
Markdown Version for GitHub Pages

If you’re using Markdown (.md files), use this:

[![Support us on Patreon](https://img.shields.io/badge/Support%20Us-Patreon-FF424D?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/YOUR_USERNAME)

This will create a stylish Patreon button using shields.io.

Would you like me to help style it further? 🚀😊
You said:
Make a beautiful link to telegram chat
ChatGPT said:

Sure! Here’s a beautiful Telegram chat link you can use for your website:
🔗 Join Our Telegram Chat

(Replace YOUR_TELEGRAM_CHAT with your actual Telegram group link.)
Fancy Button for Websites

If you want a stylish Telegram button, you can use this HTML:

<a href="https://t.me/YOUR_TELEGRAM_CHAT" target="_blank" style="
display: inline-block;
background-color: #0088cc;
color: white;
font-weight: bold;
padding: 10px 20px;
border-radius: 8px;
text-decoration: none;
font-size: 18px;
box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
">
💬 Join Our Telegram Chat
</a>

Replace "YOUR_TELEGRAM_CHAT" with your actual Telegram chat username.
Markdown Version for GitHub Pages

If you’re using Markdown (.md files), use this:

[![Join us on Telegram](https://img.shields.io/badge/Join%20Us-Telegram-0088cc?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/YOUR_TELEGRAM_CHAT)

This creates a modern badge button with a Telegram logo.

Would you like me to customize it further? 🚀😊
You said:
Can you make me paypal donate form based off:

<form class="widget-donate d-flex align-items-center" action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
    <input type="hidden" name="cmd" value="_s-xclick">
    <input type="hidden" name="hosted_button_id" value="5YQDFQ9LCLKTU">

    <select class="form-control me-2" name="os0">
        <option value="$25/month">$25 per Month</option>
        <option value="$10/month">$10 per Month</option>
        <option value="$5/month">$5 per Month</option>
    </select>
    
    <button type="submit" class="btn btn-warning">Стать инвестором</button>
</form>
ChatGPT said:

Here is a styled and modern PayPal donate form based on your original code. This form allows users to select a donation amount and proceed with PayPal payments. I have enhanced it with a more visually appealing design:

<form class="widget-donate d-flex align-items-center" action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" style="
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 8px;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.1);">
    <input type="hidden" name="cmd" value="_s-xclick">
    <input type="hidden" name="hosted_button_id" value="5YQDFQ9LCLKTU">

    <select class="form-control" name="os0" style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; font-size: 16px;">
        <option value="$25/month">$25 per Month</option>
        <option value="$10/month">$10 per Month</option>
        <option value="$5/month">$5 per Month</option>
    </select>
    
    <button type="submit" class="btn btn-warning" style=" background-color: #ffba00;
        color: black;
        font-weight: bold;
        padding: 10px 15px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        transition: 0.3s;
    ">
        💛 Стать инвестором
    </button>
</form>