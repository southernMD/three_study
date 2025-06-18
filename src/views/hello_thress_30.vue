<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import Experience from '@/class/30/Experience'
onMounted(() => {
    new Experience(document.querySelector('canvas.webgl')!)
})
</script>

<style scoped lang="less"></style>