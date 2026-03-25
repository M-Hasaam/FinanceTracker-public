import { ImageResponse } from 'next/og';
import { WalletIcon } from '@/common/icons';

export const size = {
  width: 64,
  height: 64,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          color: '#1d1d41',
        }}
      >
        <WalletIcon width="52" height="52" />
      </div>
    ),
    {
      ...size,
    },
  );
}
