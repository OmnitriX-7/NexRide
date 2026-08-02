// import * as Print from 'expo-print';
// import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const generateAndShareReceipt = async (rideDetails: any, profile: any) => {
  try {
    const date = new Date(rideDetails.created_at).toLocaleString();
    const fare = rideDetails.fare_amount.toFixed(2);
    
    // Simulate some standard receipt breakdown
    const baseFare = (rideDetails.fare_amount * 0.8).toFixed(2);
    const taxes = (rideDetails.fare_amount * 0.2).toFixed(2);

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', 'Helvetica', sans-serif; color: #333; margin: 0; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #2563eb; letter-spacing: -1px; }
            .title { font-size: 24px; font-weight: bold; margin-top: 10px; color: #0f172a; }
            .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .label { color: #64748b; }
            .value { font-weight: 500; color: #0f172a; text-align: right; }
            .total-row { font-size: 18px; font-weight: bold; border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">NexRide</div>
            <div class="title">Ride Receipt</div>
            <div class="subtitle">${date}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Trip Details</div>
            <div class="row">
              <span class="label">Ride ID</span>
              <span class="value">#${rideDetails.id.split('-')[0].toUpperCase()}</span>
            </div>
            <div class="row">
              <span class="label">Rider</span>
              <span class="value">${profile?.full_name || 'Guest User'}</span>
            </div>
            <div class="row">
              <span class="label">Driver</span>
              <span class="value">${rideDetails.driver?.full_name || 'NexRide Driver'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Route</div>
            <div class="row">
              <span class="label">Pickup</span>
              <span class="value" style="max-width: 60%;">${rideDetails.pickup_name}</span>
            </div>
            <div class="row">
              <span class="label">Drop-off</span>
              <span class="value" style="max-width: 60%;">${rideDetails.dropoff_name}</span>
            </div>
            <div class="row">
              <span class="label">Distance</span>
              <span class="value">${rideDetails.distance_km || 'Unknown'} km</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Payment Summary</div>
            <div class="row">
              <span class="label">Base Fare</span>
              <span class="value">₹${baseFare}</span>
            </div>
            <div class="row">
              <span class="label">Taxes & Fees</span>
              <span class="value">₹${taxes}</span>
            </div>
            <div class="row">
              <span class="label">Payment Method</span>
              <span class="value" style="text-transform: capitalize;">${rideDetails.payment_method || 'Cash'}</span>
            </div>
            <div class="row total-row">
              <span>Total Paid</span>
              <span>₹${fare}</span>
            </div>
          </div>
          
          <div class="footer">
            Thank you for riding with NexRide!<br/>
            If you have any issues with your ride, please contact support via the NexBot in your app.
          </div>
        </body>
      </html>
    `;

    // 1. Generate PDF
    // const { uri } = await Print.printToFileAsync({
    //   html: htmlContent,
    //   base64: false
    // });
    const uri = 'mock_uri';

    console.log('File has been saved to:', uri);

    // 2. Share PDF
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // const isAvailable = await Sharing.isAvailableAsync();
      const isAvailable = false;
      if (isAvailable) {
        // await Sharing.shareAsync(uri, {
        //   mimeType: 'application/pdf',
        //   dialogTitle: 'Share your NexRide Receipt',
        //   UTI: 'com.adobe.pdf' // iOS identifier
        // });
      } else {
        console.log("Sharing is not available on this device");
      }
    };
  } catch (error) {
    console.error("Error generating receipt:", error);
  }
};
