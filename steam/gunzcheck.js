const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Constants
const appId = 3139440; // GunZ app ID
const apiUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
const outputFilePath = path.join(__dirname, 'last_gunz.json');
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL; // Discord Webhook URL from environment variable

// Function to fetch GunZ status
async function checkGunZStatus() {
  try {
    // Fetch data from Steam API
    const response = await axios.get(apiUrl);
    
    // Log the full response to see if it's valid
    console.log('Raw API Response:', response.data);
    
    // Check if the response has valid data for the given appId
    const appData = response.data[appId];

    if (!appData || !appData.success) {
      console.error('Failed to fetch valid game details or app data is not successful.');
      return;
    }

    // Extract release details
    const releaseDate = appData.data.release_date;
    const releaseStatus = releaseDate.coming_soon
      ? 'Coming Soon'
      : releaseDate.date
      ? `Released or Scheduled: ${releaseDate.date}`
      : 'To Be Announced';

    const newData = {
      appId,
      name: appData.data.name,
      releaseStatus,
      lastChecked: new Date().toISOString(),
    };

    // Load existing data if it exists
    let existingData = null;
    if (fs.existsSync(outputFilePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
      } catch (error) {
        console.error('Error reading existing JSON file:', error.message);
      }
    }

    // Check if the release status has changed
    const isReleaseStatusChanged = existingData && newData.releaseStatus !== existingData.releaseStatus;

    // Prepare the Discord webhook payload
    const changeStatus = isReleaseStatusChanged
      ? 'Changes detected!'
      : 'No changes detected.';

    const discordPayload = {
      content: `🔔 **GunZ Status Check:** ${changeStatus}`,
      embeds: [
        {
          title: `GunZ: The Duel`,
          description: `Checks for changes to GunZ: The Duel steam page, hourly`,
          fields: [
            { name: 'Release Status', value: newData.releaseStatus, inline: true },
            { name: 'Last Checked', value: newData.lastChecked, inline: true },
          ],
          color: 0xff4500, // Orange color
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Send notification to Discord (always sends, but only mentions "Changes detected!" if status changed)
    try {
      await axios.post(discordWebhookUrl, discordPayload);
      console.log('Discord notification sent successfully!');
    } catch (error) {
      console.error('Error sending Discord notification:', error.message);
    }

    // Update the JSON file with the new data (only if release status has changed)
    if (isReleaseStatusChanged) {
      try {
        fs.writeFileSync(outputFilePath, JSON.stringify(newData, null, 2), 'utf8');
        console.log('Game status updated locally.');
      } catch (error) {
        console.error('Error writing to file:', error.message);
      }
    } else {
      console.log('No change in release status, but notification still sent.');
    }

  } catch (error) {
    console.error('Error checking GunZ status:', error.message);
  }
}

// Run the function
checkGunZStatus();
