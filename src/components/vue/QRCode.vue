<template>
  <img
    :src="qrSrc"
    :alt="alt"
    :width="size"
    :height="size"
    :class="['pesafy-qrcode', className]"
    loading="lazy"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  base64: string;
  alt?: string;
  size?: number;
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  alt: "M-Pesa QR Code",
  size: 300,
  className: "",
});

const qrSrc = computed(() => {
  return props.base64.startsWith("data:")
    ? props.base64
    : `data:image/png;base64,${props.base64}`;
});
</script>

<style scoped>
.pesafy-qrcode {
  display: block;
}
</style>
