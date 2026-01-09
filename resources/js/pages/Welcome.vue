<script setup lang="ts">
import { dashboard, login, register } from '@/routes';
import { Head, Link } from '@inertiajs/vue3';

withDefaults(
	defineProps<{
		canRegister: boolean;
	}>(),
	{
		canRegister: true,
	},
);
</script>

<template>
	<Head title="Welcome">
		<link rel="preconnect" href="https://rsms.me/" />
		<link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
	</Head>

	<section class="min-h-dvw bg-slate-950 text-slate-100">
		<!-- HERO -->
		<section class="relative overflow-hidden">
			<div
				class="absolute inset-0 bg-linear-to-br from-indigo-600/30 via-purple-600/20 to-cyan-500/20 blur-3xl"
			></div>

			<div class="px-5">
				<header
					class="relative z-10 mx-auto my-6 w-full rounded-4xl border border-indigo-900 px-5 text-sm not-has-[nav]:hidden lg:max-w-4xl"
				>
					<nav
						class="flex w-full flex-wrap items-center justify-between gap-4 py-5"
					>
						<Link
							href="/"
							class="px-5 py-1.5 text-sm leading-normal font-bold text-white hover:border-[#19140035] dark:text-[#EDEDEC] dark:hover:border-[#3E3E3A]"
						>
							CALL ME BRO
						</Link>

						<div class="flex items-center justify-between gap-4">
							<Link
								v-if="$page.props.auth.user"
								:href="dashboard()"
								class="rounded-sm px-2 py-1 text-base leading-normal font-bold text-white hover:border-[#1915014a] dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
							>
								Dashboard
							</Link>
							<div v-else class="flex gap-5">
								<Link
									:href="login()"
									class="rounded-sm px-2 py-1 text-base leading-normal font-bold text-white hover:border-[#1915014a] hover:text-gray-100 dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
								>
									Log in
								</Link>
								<Link
									v-if="canRegister"
									:href="register()"
									class="rounded-sm px-2 py-1 text-base leading-normal font-bold text-white hover:border-[#1915014a] hover:text-gray-100 dark:border-[#3E3E3A] dark:text-[#EDEDEC] dark:hover:border-[#62605b]"
								>
									Register
								</Link>
							</div>
						</div>
					</nav>
				</header>
			</div>

			<div class="relative mx-auto max-w-7xl px-6 py-28">
				<div class="grid items-center gap-12 md:grid-cols-2">
					<div>
						<h1
							class="text-4xl leading-tight font-bold tracking-tight sm:text-5xl"
						>
							Голосовые и видео-звонки
							<span
								class="bg-linear-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"
							>
								без ограничений
							</span>
						</h1>

						<p class="mt-6 max-w-xl text-lg font-semibold text-white">
							Общайтесь 1-на-1 или в группах. Видео, голос, демонстрация экрана
							— всё в одном клике.
						</p>

						<div class="mt-10 flex flex-wrap gap-4">
							<Link
								:href="register()"
								class="rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-400"
							>
								Начать бесплатно
							</Link>
							<a
								href="#"
								class="rounded-xl border border-slate-700 px-6 py-3 font-semibold transition hover:bg-slate-800 hover:text-white"
							>
								Посмотреть демо
							</a>
						</div>
					</div>

					<!-- MOCKUP -->
					<div class="relative">
						<div
							class="rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
						>
							<div class="grid grid-cols-2 gap-3">
								<div class="aspect-video rounded-xl bg-slate-800"></div>
								<div class="aspect-video rounded-xl bg-slate-800"></div>
								<div
									class="col-span-2 aspect-video rounded-xl bg-slate-800"
								></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- FEATURES -->
		<section class="mx-auto max-w-7xl px-6 py-24">
			<h2 class="text-center text-4xl font-bold">Всё, что нужно для общения</h2>

			<div class="mt-16 grid gap-8 md:grid-cols-3">
				<div class="rounded-2xl border border-slate-800 bg-slate-900 p-8">
					<h3 class="text-xl font-semibold text-white">1-на-1 звонки</h3>
					<p class="mt-4 text-slate-400">
						Быстрые и стабильные видеозвонки без лишних действий.
					</p>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900 p-8">
					<h3 class="text-xl font-semibold text-white">Групповые комнаты</h3>
					<p class="mt-4 text-slate-400">
						Общение с командой, друзьями или сообществом в реальном времени.
					</p>
				</div>

				<div class="rounded-2xl border border-slate-800 bg-slate-900 p-8">
					<h3 class="text-xl font-semibold text-white">Демонстрация экрана</h3>
					<p class="mt-4 text-slate-400">
						Показывайте презентации, код или дизайн в один клик.
					</p>
				</div>
			</div>
		</section>

		<!-- HOW IT WORKS -->
		<section class="bg-linear-to-r from-slate-900 to-indigo-800 py-24">
			<div class="mx-auto max-w-7xl px-6">
				<h2 class="text-center text-4xl font-bold">Как это работает</h2>

				<div class="mt-16 grid gap-12 text-center md:grid-cols-3">
					<div>
						<div
							class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white"
						>
							1
						</div>
						<p class="text-lg">Создайте комнату</p>
					</div>

					<div>
						<div
							class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white"
						>
							2
						</div>
						<p class="text-lg">Пригласите участников</p>
					</div>

					<div>
						<div
							class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white"
						>
							3
						</div>
						<p class="text-lg">Начните общение</p>
					</div>
				</div>
			</div>
		</section>

		<!-- CTA -->
		<section class="mx-auto max-w-7xl px-6 py-24 text-center">
			<h2 class="text-4xl font-bold">Готовы начать?</h2>
			<p class="mt-4 text-slate-400">
				Создайте комнату и начните звонок уже сегодня.
			</p>

			<div class="mt-8">
				<Link
					:href="register()"
					class="inline-block rounded-xl bg-indigo-500 px-8 py-4 text-lg font-semibold text-white transition hover:bg-indigo-400"
				>
					Регистрация
				</Link>
			</div>
		</section>
	</section>
</template>
