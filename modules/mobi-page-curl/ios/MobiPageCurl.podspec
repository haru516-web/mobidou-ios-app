Pod::Spec.new do |s|
  s.name = 'MobiPageCurl'
  s.version = '1.0.0'
  s.summary = 'Native page curl for the Mobidou goshuin book'
  s.description = 'An iOS UIPageViewController-backed, double-sided washi book.'
  s.author = 'Mobby'
  s.homepage = 'https://expo.dev'
  s.license = { :type => 'MIT' }
  s.platforms = { :ios => '15.1' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'UIKit'
  s.swift_version = '5.9'
  s.source_files = '**/*.{h,m,mm,swift}'
end
