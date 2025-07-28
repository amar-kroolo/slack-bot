import UserModel from "../models/User.js";

export const requireUserAuthentication = async ({ email, client, channel, onDeny }) => {
  const signupUrl = "https://app.kroolo.com/signup";


  if (!email) {
    if (client && channel) {
      await client.chat.postMessage({
        channel,
        text: "🔐 Authentication Required",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🔐 Authentication Required",
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Hi there! 👋\n\nI couldn't find an email address associated with your Slack profile. To use this bot, you'll need a Kroolo account.\n\n*Don't worry - it only takes a minute to get started!*",
            },
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "📝 *What you can do:*\n• Sign up for a new Kroolo account\n• Login if you already have an account\n",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "🚀 Get Started",
                  emoji: true,
                },
                url: signupUrl,
                style: "primary",
              },
             
            ],
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "ℹ️ *Tip:* Make sure your Slack profile has an email address for seamless authentication.",
              },
            ],
          },
        ],
      });
    }
    if (onDeny) onDeny();
    return null;
  }

  // Example override email (remove in production)
  // email = "piyush.upadhyay@kroolo.info";

  const user = await UserModel.findOne({ email: email.trim(), status: "ACTIVE" });
  if (!user) {
    // Check if user exists but is inactive
    const inactiveUser = await UserModel.findOne({ email: email.trim(), status: "INACTIVE" });
    
    if (client && channel) {
      if (inactiveUser) {
        // User exists but is inactive
        await client.chat.postMessage({
          channel,
          text: "⚠️ Account Inactive",
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "⚠️ Account Inactive",
                emoji: true,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Hello! 👋\n\nI found your account (${email}), but it appears to be inactive at the moment.\n\n*Don't worry - this can be easily resolved!*`,
              },
            },
            {
              type: "divider",
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "🔧 *How to reactivate:*\n• Login to your Kroolo account\n",
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "🔓 Reactivate Account",
                    emoji: true,
                  },
                  url: signupUrl,
                  style: "primary",
                },
               
              ],
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `📧 Account email: *${email}* | 🕐 Please allow up to 24 hours for account activation.`,
                },
              ],
            },
          ],
        });
      } else {
        // User doesn't exist at all
        await client.chat.postMessage({
          channel,
          text: "👤 Account Not Found",
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "👤 Account Not Found",
                emoji: true,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Hello! 👋\n\nI couldn't find a Kroolo account associated with *${email}*.\n\n*Ready to join thousands of users already using Kroolo?*`,
              },
            },
            {
              type: "divider",
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "✨ *Why join Kroolo?*\n• 🚀 Streamline your workflows\n• 🤖 AI-powered assistance\n• 🔗 Connect all your favorite tools\n• 📊 Boost your productivity",
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "🎉 Create Account",
                    emoji: true,
                  },
                  url: signupUrl,
                  style: "primary",
                },
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "🔑 Already Have Account?",
                    emoji: true,
                  },
                  url: "https://app.kroolo.com/login",
                },
              ],
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `📧 Looking for: *${email}* | 💡 *Tip:* Make sure you're using the same email as your Slack profile.`,
                },
              ],
            },
          ],
        });
      }
    }
    if (onDeny) onDeny();
    return null;
  }

  // Success: return userId with a subtle welcome back message (optional)
  if (client && channel) {
    await client.chat.postMessage({
      channel,
      text: `✅ Welcome back! Processing your request...`,
    });
  }

  return user.userId;
};
