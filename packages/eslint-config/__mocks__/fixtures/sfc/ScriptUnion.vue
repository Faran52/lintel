<script setup lang="ts">
type Value = { a: string } | { b: string };

const value: Value = { a: 'x' };
</script>

<template>
  <div>{{ value }}</div>
</template>
