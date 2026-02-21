import type { Meta, StoryObj } from "@storybook/react";
import { QRCode } from "./QRCode";

// Sample base64 QR code (small test image)
const sampleQR =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const meta: Meta<typeof QRCode> = {
  title: "Pesafy/QRCode",
  component: QRCode,
  tags: ["autodocs"],
  argTypes: {
    size: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof QRCode>;

export const Default: Story = {
  args: {
    base64: sampleQR,
  },
};

export const Large: Story = {
  args: {
    base64: sampleQR,
    size: 500,
  },
};

export const Small: Story = {
  args: {
    base64: sampleQR,
    size: 150,
  },
};
